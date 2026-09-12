// Build estático (SSG) + assets de produção: pré-renderiza páginas, escreve HTML,
// copia os runtimes client, e gera sitemap.xml/robots.txt no .fly-out.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import type { ScanResult } from "../router/scanner.ts";
import { getCompiled } from "../compiler/index.ts";
import { createPipeline } from "../core/pipeline.ts";
import { buildSitemap, buildRobots } from "../seo/sitemap.ts";
import { buildCss } from "./tailwind.ts";
import { generateTypes } from "./types.ts";
import { buildDeploy } from "./deploy.ts";

function loadRuntime(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

export function createBuild(
  scan: ScanResult,
  opts: {
    appDir: string;
    siteUrl?: string;
    minify?: boolean;
    outDir?: string;
    frameworkRoot?: string;
    css?: { tailwind?: boolean; input?: string };
  },
) {
  const outDir = opts.outDir ?? ".fly-out";

  function out(rel: string) {
    return join(outDir, rel);
  }

  function write(rel: string, data: string) {
    const full = out(rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, data);
  }

  function writeHtml(route: string, html: string) {
    const file =
      route === "/"
        ? "index.html"
        : route.replace(/^\//, "").replace(/:/g, "__") + ".html";
    write(file, html);
  }

  // Copia o HTML SSG para static/ (GitHub Pages). Rota sem params => sempre estática;
  // rota com params só é estática se tiver generateStaticParams (vem do build()).
  function writeHtmlStatic(route: string, html: string) {
    const file =
      route === "/"
        ? "index.html"
        : route.replace(/^\//, "").replace(/:/g, "__") + ".html";
    const full = join("static", file);
    mkdirSync(dirname(join(outDir, full)), { recursive: true });
    writeFileSync(join(outDir, full), html);
  }

  async function build() {
    const pipeline = createPipeline(scan, opts as any);
    // Pre-render: força SSR sem streaming para gerar HTML completo (SEO no <head>).
    const ssgReq = (u: string) =>
      new Request("http://localhost" + u, {
        headers: { "x-fly-nostream": "1" },
      });
    for (const entry of scan.pages) {
      if (entry.paramNames.length === 0) {
        const res = await pipeline.handle(ssgReq(entry.route));
        if (res.status === 200) {
          const html = await res.text();
          writeHtml(entry.route, html);
          writeHtmlStatic(entry.route, html);
        }
      } else {
        const compiled = getCompiled(entry.file);
        if (compiled.generateStaticParams) {
          const paramsList: Array<Record<string, string>> =
            await compiled.generateStaticParams();
          for (const p of paramsList) {
            const route = entry.route.replace(/:(\w+)/g, (_, k: string) =>
              String((p as any)[k]),
            );
            const res = await pipeline.handle(ssgReq(route));
            if (res.status === 200) {
              const html = await res.text();
              writeHtml(route, html);
              writeHtmlStatic(route, html);
            }
          }
        }
      }
    }
  }

  async function buildProd() {
    await build();
    // Assets de runtime (servidos também em runtime sem hook de assets estáticos)
    write(
      "_fly/client.js",
      opts.minify
        ? loadRuntime("../runtime/client.js")
        : loadRuntime("../runtime/client.js"),
    );
    write(
      "_fly/actions-client.js",
      loadRuntime("../runtime/actions-client.js"),
    );
    write("_fly/client-nav.js", loadRuntime("../runtime/client-nav.js"));
    // SEO estático
    const routes = scan.pages.map((p) => p.route);
    write("sitemap.xml", buildSitemap(routes, opts.siteUrl ?? ""));
    write("robots.txt", buildRobots(opts.siteUrl ?? ""));
    // CSS gerado (tailwind standalone quando habilitado, senão interno)
    write(
      "_fly/styles.css",
      buildCss(scan, (f) => getCompiled(f).style, {
        tailwind: (opts as any).css?.tailwind,
        tailwindInput: (opts as any).css?.input,
        appDir: opts.appDir,
      }).css,
    );
    write("_fly/hmr-client.js", loadRuntime("../runtime/hmr-client.js"));
    write("_fly/i18n-client.js", loadRuntime("../runtime/i18n-client.js"));
    // Tipos end-to-end (rotas/actions/utilitários)
    write("_fly/fly.d.ts", generateTypes(scan));
    // Artefatos de deploy: Dockerfile, server/start.mjs, vercel/, static/.nojekyll
    const frameworkRoot =
      opts.frameworkRoot ?? new URL("../../", import.meta.url).pathname;
    buildDeploy(outDir, scan, {
      appDir: opts.appDir,
      outDir,
      siteUrl: opts.siteUrl,
      frameworkRoot,
    });
  }

  return { build, buildProd };
}
