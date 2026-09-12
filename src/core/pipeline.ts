// Pipeline de request: middleware -> router -> loader -> render (SSR/ISR/streaming) -> cache -> response.
import { readFileSync } from "node:fs";
import {
  getCompiled,
  actionRegistry,
  setCompileEnv,
  type Compiled,
  type SsrCtx,
  FlyRedirect,
  FlyNotFound,
} from "../compiler/index.ts";
import { type ScanResult } from "../router/scanner.ts";
import { matchRoute } from "../router/matcher.ts";
import { dataCache, routeCache } from "../cache/revalidate.ts";
import { serverEnv, publicEnv } from "../core/env.ts";
import { renderHead, type Meta } from "../seo/head.ts";
import { buildSitemap, buildRobots } from "../seo/sitemap.ts";
import { escapeHtml } from "../runtime/server.ts";
import { makeFlyUtils } from "./utils.ts";
import { rateLimitClient } from "../core/security.ts";
import { buildCss } from "../core/tailwind.ts";
import {
  loadDicts,
  createT,
  localeFromPath,
  resolveLocale,
  type FlyI18nConfig,
} from "../core/i18n.ts";

export type FlyConfig = {
  appDir: string;
  siteUrl?: string;
  adapter?: string;
  robots?: string;
  dev?: boolean;
};

const clientRuntimeCache = new Map<string, string>();
let envStore: Record<string, string> = {};
let hmrClientSrc = "";
try {
  hmrClientSrc = readFileSync(
    new URL("../runtime/hmr-client.js", import.meta.url),
    "utf8",
  );
} catch {}

function getRuntime(path: string): string {
  if (!clientRuntimeCache.has(path)) {
    clientRuntimeCache.set(
      path,
      readFileSync(new URL(path, import.meta.url), "utf8"),
    );
  }
  return clientRuntimeCache.get(path)!;
}

function buildCtx(request: Request, extra: Partial<SsrCtx> = {}): SsrCtx {
  const url = new URL(request.url);
  const flyUtils = makeFlyUtils({ request });
  return { request, url, cache: dataCache, flyUtils, env: envStore, ...extra };
}

type RenderResult =
  | { kind: "ok"; out: any }
  | { kind: "redirect"; url: string; status: number }
  | { kind: "notFound" }
  | { kind: "error"; error: unknown };

// Converte padrões simples de matcher (ex.: /admin/*, /api/:id) em regex.
export function globToRegex(pattern: string): RegExp {
  let p = pattern
    .replace(/\*\*/g, "(.*?)")
    .replace(/\*/g, "([^/]*)")
    .replace(/:(\w+)/g, "([^/]+)")
    .replace(/\//g, "\\/");
  let src = "^" + p + "$";
  return new RegExp(src);
}

function matchMatcher(matcher: string[] | undefined, path: string): boolean {
  if (!matcher || matcher.length === 0) return true; // sem matcher => global
  for (const pat of matcher) {
    if (globToRegex(pat).test(path)) return true;
  }
  return false;
}

async function safeRender(c: Compiled, ctx: SsrCtx): Promise<RenderResult> {
  try {
    const out = await c.render(ctx);
    return { kind: "ok", out };
  } catch (e) {
    if (e instanceof FlyRedirect)
      return { kind: "redirect", url: e.url, status: e.status };
    if (e instanceof FlyNotFound) return { kind: "notFound" };
    return { kind: "error", error: e };
  }
}

export function createPipeline(scan: ScanResult, config: FlyConfig) {
  envStore = serverEnv(config.appDir);
  setCompileEnv(publicEnv(envStore));
  const i18n: FlyI18nConfig | undefined = (config as any).i18n;
  const dicts = i18n ? loadDicts(config.appDir) : {};
  const globalCss = buildCss(scan, (f) => getCompiled(f).style, {
    tailwind: (config as any).css?.tailwind,
    tailwindInput: (config as any).css?.input,
    appDir: config.appDir,
  }).css;

  function buildLocaleCtx(
    request: Request,
    extra: Partial<SsrCtx> = {},
  ): SsrCtx {
    if (!i18n) return buildCtx(request, extra);
    const locale = (extra as any).locale ?? resolveLocale(request, i18n);
    const t = createT(locale, dicts, i18n.defaultLocale);
    return buildCtx(request, { ...extra, locale, t } as any);
  }
  const rootLayout =
    scan.layouts.find((l) => l.route === "/") ?? scan.layouts[0] ?? null;
  const rootLoading = scan.loadings.find((l) => l.route === "/") ?? null;
  const rootError = scan.errors.find((l) => l.route === "/") ?? null;
  const notFoundEntry = scan.pages.find((p) => p.route === "/404") ?? null;

  const actionScripts = scan.actionFiles
    .map((f) => getCompiled(f).clientCode)
    .join("\n");
  const cssLink = globalCss.trim()
    ? `<link rel="stylesheet" href="/__fly/styles.css">`
    : "";

  // Layouts que se aplicam a um path: as rotas de layout que são prefixo do path da página,
  // da mais específica (exceto a própria página) até a raiz.
  function collectLayouts(pageRoute: string): { entry: any; route: string }[] {
    const applicable: { entry: any; route: string }[] = [];
    for (const l of scan.layouts) {
      const lr = l.route;
      if (lr === "/") {
        applicable.push({ entry: l, route: lr });
        continue;
      }
      if (pageRoute === lr || pageRoute.startsWith(lr + "/")) {
        applicable.push({ entry: l, route: lr });
      }
    }
    // Ordena do mais específico (mais profundo) para a raiz.
    applicable.sort(
      (a, b) =>
        (b.route === "/" ? -1 : b.route.length) -
        (a.route === "/" ? -1 : a.route.length),
    );
    return applicable;
  }

  // Aplica a cadeia de layouts de dentro para fora sobre o HTML do conteúdo.
  async function wrapInLayouts(
    html: string,
    layouts: { entry: any }[],
    request: Request,
    params: Record<string, string>,
    data: any,
    slots: Record<string, string>,
  ): Promise<string> {
    let content = html;
    for (const l of layouts) {
      const c = getCompiled(l.entry.file);
      const ctx = buildLocaleCtx(request, {
        slotContent: content,
        data: {},
        params,
        slots,
      });
      const out = await c.render(ctx);
      content = await fillDeferred(out.html, (out as any).deferred);
    }
    return content;
  }

  function swapAwaitScript(id: string, html: string): string {
    return (
      `<script>(function(){var t=document.querySelector('template[data-fly-await="${id}"]');` +
      `if(t){var d=document.createElement('template');d.innerHTML=${JSON.stringify(html)};` +
      `t.replaceWith(d.content.cloneNode(true));}})();</script>`
    );
  }

  async function fillDeferred(html: string, deferred: any): Promise<string> {
    if (!deferred || deferred.length === 0) return html;
    const results = await Promise.all(deferred);
    let out = html;
    for (const r of results) {
      const re = new RegExp(
        `<template data-fly-await="${r.id}">[\\s\\S]*?</template>`,
      );
      out = out.replace(re, () => r.html);
    }
    return out;
  }

  function bootstrap(
    compiled: Compiled,
    data: any,
    streaming: boolean,
    locale?: string,
  ): string {
    const dataJson = JSON.stringify({ data, params: {} });
    const actionsMod = `<script type="module">${actionScripts}</script>`;
    const hmr = (config as any).dev ? `<script>${hmrClientSrc}</script>` : "";
    const loc = locale
      ? `<script>window.__FLY_LOCALE__=${JSON.stringify(locale)};</script>`
      : "";
    if (streaming) {
      // mount acontece após o swap (no chunk streamado)
      return (
        `<script type="module">${compiled.clientCode}\n${actionScripts}</script>` +
        hmr +
        loc
      );
    }
    return (
      `<script>window.__FLY_DATA__ = ${dataJson};</script>\n` +
      loc +
      `<script type="module">${compiled.clientCode}\n${actionScripts}</script>\n` +
      `<script>if (window.__flyMount) window.__flyMount(window.__FLY_DATA__);</script>` +
      hmr
    );
  }

  async function renderShell(
    slotContent: string,
    request: Request,
  ): Promise<string> {
    if (!rootLayout) return slotContent;
    const layoutCompiled = getCompiled(rootLayout.file);
    const out = await layoutCompiled.render(
      buildLocaleCtx(request, { slotContent, data: {} }),
    );
    return out.html;
  }

  async function notFoundResponse(request: Request): Promise<Response> {
    if (notFoundEntry) {
      const c = getCompiled(notFoundEntry.file);
      const res = await safeRender(c, buildLocaleCtx(request));
      if (res.kind === "ok")
        return new Response(await renderShell(res.out.html, request), {
          status: 404,
          headers: { "content-type": "text/html" },
        });
    }
    return new Response("Not Found", { status: 404 });
  }

  async function errorResponse(
    request: Request,
    error: unknown,
  ): Promise<Response> {
    if (rootError) {
      const c = getCompiled(rootError.file);
      const res = await safeRender(
        c,
        buildLocaleCtx(request, {
          data: { message: String((error as Error)?.message ?? error) },
        }),
      );
      if (res.kind === "ok")
        return new Response(await renderShell(res.out.html, request), {
          status: 500,
          headers: { "content-type": "text/html" },
        });
    }
    console.error(error);
    return new Response("Internal Error", { status: 500 });
  }

  async function renderPage(
    path: string,
    params: Record<string, string>,
    request: Request,
    forcedLocale?: string,
  ): Promise<Response> {
    const pageEntry = matchRoute(scan.pages, path);
    if (!pageEntry) return notFoundResponse(request);

    const compiled = getCompiled(pageEntry.entry.file);
    // Streaming ativado quando há loading boundary e é um GET em runtime. O pre-render
    // (SSG) envia "x-fly-nostream" para obter HTML completo com SEO no <head>.
    const noStream = request.headers.get("x-fly-nostream") === "1";
    const streaming = !!rootLoading && request.method === "GET" && !noStream;
    const ctx = buildLocaleCtx(request, {
      params,
      locale: forcedLocale,
    } as any);

    if (!streaming) {
      const res = await safeRender(compiled, ctx);
      if (res.kind === "redirect")
        return Response.redirect(res.url, res.status as any);
      if (res.kind === "notFound") return notFoundResponse(request);
      if (res.kind === "error") return errorResponse(request, res.error);
      const data = res.out.data;
      const head = renderHead(
        res.out.meta ? res.out.meta({ data, params }) : {},
        config.siteUrl,
      );
      const bs = bootstrap(compiled, data, false, (ctx as any).locale);
      const pageHtml = await fillDeferred(
        res.out.html,
        (res.out as any).deferred,
      );
      const layouts = collectLayouts(pageEntry.entry.route);
      const html = await wrapInLayouts(
        pageHtml,
        layouts,
        request,
        params,
        data,
        {},
      );
      if (layouts.length > 0 && html.includes("__FLY_HEAD__")) {
        return new Response(
          html
            .replace("__FLY_HEAD__", head + cssLink)
            .replace("__FLY_SCRIPTS__", bs),
          {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          },
        );
      }
      // Sem layout (sem placeholders): monta HTML mínimo com #__fly
      const minimal = `<!DOCTYPE html><html><head>${head}${cssLink}</head><body><div id="__fly">${pageHtml}</div>${bs}</body></html>`;
      return new Response(minimal, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // STREAMING com loading boundary (Suspense-like, sem VDOM)
    const enc = new TextEncoder();
    const layouts = collectLayouts(pageEntry.entry.route);
    // loading mais específico que sirva à rota (do mais profundo ao raiz)
    const pageRoute = pageEntry.entry.route;
    const loadingEntry =
      scan.loadings
        .filter(
          (l) =>
            l.route === "/" ||
            pageRoute === l.route ||
            pageRoute.startsWith(l.route + "/"),
        )
        .sort((a, b) => b.route.length - a.route.length)[0] ?? null;
    const loadingCompiled = loadingEntry
      ? getCompiled(loadingEntry.file)
      : null;
    const shellLayout = await wrapInLayouts(
      loadingCompiled
        ? (await loadingCompiled.render(buildLocaleCtx(request, { data: {} })))
            .html + "__FLY_STREAM__"
        : "__FLY_STREAM__",
      layouts,
      request,
      params,
      {},
      {},
    );
    let [headPart, tailPart] = shellLayout.split("__FLY_STREAM__") as [
      string,
      string,
    ];
    // No streaming, o head da página só é conhecido após o loader resolver; emite head
    // de site default já no primeiro chunk (meta específica por página é aplicada no
    // client via document.title) e remove os placeholders do layout.
    headPart = headPart.replace("__FLY_HEAD__", renderHead({}, config.siteUrl));
    tailPart = tailPart.replace("__FLY_SCRIPTS__", "");
    const bs = bootstrap(compiled, {}, true, (ctx as any).locale);

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(enc.encode(cssLink + headPart + bs));
        const res = await safeRender(compiled, ctx);
        if (res.kind === "ok") {
          const data = res.out.data;
          const meta: Meta = res.out.meta ? res.out.meta({ data, params }) : {};
          const deferred = (res.out as any).deferred as
            Array<Promise<{ id: string; html: string }>> | undefined;
          const swap =
            `<script>window.__FLY_DATA__ = ${JSON.stringify({ data, params })};</script>` +
            `<template id="__fly_real" style="display:none">${res.out.html}</template>` +
            `<script>(function(){var t=document.getElementById('__fly_real'),f=document.getElementById('__fly');` +
            `if(t&&f){f.innerHTML='';f.appendChild(t.content);t.remove();}` +
            `if(${JSON.stringify(meta.title ?? "")}) document.title=${JSON.stringify(meta.title ?? "")};` +
            `if(window.__flyMount) window.__flyMount(window.__FLY_DATA__);})();</script>`;
          controller.enqueue(enc.encode(swap));
          // Cada <Await> resolvido vira um chunk que troca o placeholder.
          if (deferred && deferred.length) {
            const settled = await Promise.all(deferred);
            for (const r of settled) {
              controller.enqueue(enc.encode(swapAwaitScript(r.id, r.html)));
            }
          }
          controller.enqueue(enc.encode(tailPart));
        } else if (res.kind === "notFound") {
          controller.enqueue(
            enc.encode((await notFoundResponse(request)).body ? "" : ""),
          );
        } else if (res.kind === "redirect") {
          controller.enqueue(
            enc.encode(
              `<script>window.location.href=${JSON.stringify(res.url)};</script>` +
                tailPart,
            ),
          );
        } else {
          controller.enqueue(
            enc.encode(
              (await errorResponse(request, res.error)).body ? "" : "",
            ),
          );
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "transfer-encoding": "chunked",
      },
    });
  }

  async function handleAction(id: string, request: Request): Promise<Response> {
    const fn = actionRegistry.get(id);
    if (!fn) return new Response("Not Found", { status: 404 });
    // Rate limit para actions (mutação): 30 req/min por IP.
    const rl = rateLimitClient(request, { limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return new Response("Too Many Requests", {
        status: 429,
        headers: {
          "retry-after": String(Math.ceil((rl.reset - Date.now()) / 1000)),
        },
      });
    }
    try {
      const args =
        request.method === "GET" ? [] : await request.json().catch(() => []);
      const result = await fn(args, request);
      return Response.json({ result });
    } catch (e) {
      if (e instanceof FlyRedirect) return Response.json({ __redirect: e.url });
      if (e instanceof FlyNotFound)
        return new Response("Not Found", { status: 404 });
      return Response.json(
        { error: String((e as Error)?.message ?? e) },
        { status: 500 },
      );
    }
  }

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    let path = url.pathname;

    // runtime client
    if (path === "/__fly/client.js")
      return new Response(getRuntime("../runtime/client.js"), {
        headers: { "content-type": "application/javascript" },
      });
    if (path === "/__fly/runtime-actions.js")
      return new Response(getRuntime("../runtime/actions-client.js"), {
        headers: { "content-type": "application/javascript" },
      });
    if (path === "/__fly/client-nav.js")
      return new Response(getRuntime("../runtime/client-nav.js"), {
        headers: { "content-type": "application/javascript" },
      });
    if (path === "/__fly/hmr-client.js")
      return new Response(getRuntime("../runtime/hmr-client.js"), {
        headers: { "content-type": "application/javascript" },
      });
    if (path === "/__fly/i18n-client.js")
      return new Response(getRuntime("../runtime/i18n-client.js"), {
        headers: { "content-type": "application/javascript" },
      });
    if (path === "/__fly/hmr") {
      const hmr = (handle as any).__hmr;
      if (hmr) return hmr.sseHandler();
      return new Response(": hmr off\n\n", {
        headers: { "content-type": "text/event-stream" },
      });
    }
    if (path.startsWith("/__fly/action/")) {
      const id = path.slice("/__fly/action/".length);
      return handleAction(id, request);
    }
    if (path === "/__fly/revalidate") {
      const tag = url.searchParams.get("tag");
      const rp = url.searchParams.get("path");
      if (tag) dataCache.revalidateTag(tag);
      if (rp)
        routeCache.revalidate("route:" + (rp.startsWith("/") ? rp : "/" + rp));
      return new Response("ok");
    }
    if (path === "/__fly/styles.css") {
      return new Response(globalCss, {
        headers: { "content-type": "text/css; charset=utf-8" },
      });
    }
    if (path === "/sitemap.xml")
      return new Response(
        buildSitemap(
          scan.pages.map((p) => p.route),
          config.siteUrl ?? "",
        ),
        { headers: { "content-type": "application/xml" } },
      );
    if (path === "/robots.txt")
      return new Response(
        buildRobots(config.siteUrl ?? "", (config as any).robots),
        { headers: { "content-type": "text/plain" } },
      );

    // i18n: remove o prefixo de locale (/en/sobre -> /sobre) e guarda o locale.
    let locale: string | undefined;
    if (i18n) {
      const stripped = localeFromPath(path, i18n.locales);
      if (stripped.locale) {
        locale = stripped.locale;
        path = stripped.path;
      } else {
        locale = resolveLocale(request, i18n);
      }
    }

    // middleware (cadeia executada em ordem)
    if (matchMatcher(scan.middlewareMatcher, path)) {
      const chain = scan.middlewares?.length
        ? scan.middlewares
        : scan.middleware
          ? [scan.middleware]
          : [];
      for (const file of chain) {
        const mw = getCompiled(file);
        const mwOut = await mw.render(buildLocaleCtx(request));
        const mwFn = mwOut.middleware;
        if (!mwFn) continue;
        let nextCalled = false;
        const result = await mwFn({
          request,
          next: () => {
            nextCalled = true;
            return null;
          },
        });
        if (result instanceof Response) return result;
        if (!nextCalled) return new Response("Forbidden", { status: 403 });
      }
    }

    // API routes
    const apiMatch = matchRoute(scan.apis, path);
    if (apiMatch) {
      const compiled = getCompiled(apiMatch.entry.file);
      const out = await safeRender(
        compiled,
        buildLocaleCtx(request, { params: apiMatch.params, locale } as any),
      );
      if (out.kind === "redirect")
        return Response.redirect(out.url, out.status as any);
      if (out.kind === "notFound")
        return new Response("Not Found", { status: 404 });
      if (out.kind === "error") return errorResponse(request, out.error);
      const method = request.method.toUpperCase();
      const fn = out.out.api[method] ?? out.out.api["GET"];
      if (!fn) return new Response("Method Not Allowed", { status: 405 });
      try {
        const result = await fn({ params: apiMatch.params, request, url });
        if (result instanceof Response) return result;
        if (typeof result === "string")
          return new Response(result, {
            headers: { "content-type": "text/html" },
          });
        return Response.json(result);
      } catch (e) {
        if (e instanceof FlyRedirect)
          return Response.redirect(e.url, e.status as any);
        if (e instanceof FlyNotFound)
          return new Response("Not Found", { status: 404 });
        throw e;
      }
    }

    // Páginas
    const pageMatch = matchRoute(scan.pages, path);
    if (!pageMatch) return notFoundResponse(request);
    const ttl = getCompiled(pageMatch.entry.file).config.revalidate ?? 0;
    const cacheKey =
      "route:" +
      (locale && locale !== i18n?.defaultLocale ? `/${locale}${path}` : path);
    if (ttl > 0) {
      const cached = routeCache.get(cacheKey);
      if (cached)
        return new Response(cached.body, {
          status: cached.status,
          headers: cached.headers,
        });
    }
    const res = await renderPage(path, pageMatch.params, request, locale);
    if (ttl > 0 && res.status === 200) {
      const body = await res.text();
      routeCache.set(
        cacheKey,
        {
          body,
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        },
        ttl,
      );
      return new Response(body, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return res;
  }

  return { handle, renderPage };
}
