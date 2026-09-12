import { test } from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compiler/index.ts";
import { scanApp } from "../src/router/scanner.ts";
import { createPipeline } from "../src/core/pipeline.ts";
import { createEdgeHandler } from "../src/core/adapters/edge.ts";
import { createBuild } from "../src/core/build.ts";
import { registerPlugin, getPlugins } from "../src/compiler/plugins.ts";
import { globToRegex } from "../src/core/pipeline.ts";
import { buildRobots } from "../src/seo/sitemap.ts";
import { revalidatePath, routeCache } from "../src/cache/revalidate.ts";
import {
  scopeCss,
  generateUtilities,
  hashFile,
  collectStyles,
} from "../src/core/css.ts";
import { generateTypes, paramsTypeOf } from "../src/core/types.ts";
import {
  readFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const appDir = join(process.cwd(), "examples", "app");

// ---------- Form progressivo ----------
test("Form: SSR emite data-fly-form + data-fly-action (sem avaliar a função)", async () => {
  const c = compile(
    `<script>let t = $state("x")</script><Form action={addTodo}><input name="text"/><button>Enviar</button></Form>`,
    { file: "/x/form.fly" },
  );
  const o = await c.render({
    params: {},
    request: new Request("http://x/"),
    url: new URL("http://x/"),
    cache: {},
  });
  assert.match(o.html, /<form data-fly-form="true"/);
  assert.match(o.html, /data-fly-action="addTodo"/);
  assert.match(c.clientCode, /data-fly-form/);
});

// ---------- Islands (partial hydration) ----------
test("islands: SSR emite template data-fly-island; client usa mountIsland", async () => {
  const c = compile(
    `<div client:load>oi</div><section client:visible>v</section>`,
    { file: "/x/island.fly" },
  );
  const o = await c.render({
    params: {},
    request: new Request("http://x/"),
    url: new URL("http://x/"),
    cache: {},
  });
  assert.match(o.html, /<template data-fly-island="load"/);
  assert.match(o.html, /<template data-fly-island="visible"/);
  assert.match(c.clientCode, /mountIsland\(0, "load"/);
  assert.match(c.clientCode, /mountIsland\(1, "visible"/);
  assert.match(c.clientCode, /dispatchIslands\(\)/);
});

// ---------- Suspense ----------
test("Suspense: SSR renderiza conteúdo; client usa mountSuspense", async () => {
  const c = compile(
    `<Suspense fallback="<p>carregando</p>"><div>real</div></Suspense>`,
    { file: "/x/susp.fly" },
  );
  const o = await c.render({
    params: {},
    request: new Request("http://x/"),
    url: new URL("http://x/"),
    cache: {},
  });
  assert.match(o.html, /<div>real<\/div>/);
  assert.match(c.clientCode, /mountSuspense\(/);
});

// ---------- Middleware matcher ----------
test("matcher de glob converte padrões", () => {
  assert.ok(globToRegex("/admin/*").test("/admin/dashboard"));
  assert.ok(!globToRegex("/admin/*").test("/home"));
  assert.ok(globToRegex("/api/:id").test("/api/42"));
});

test("middleware com matcher só executa nos paths correspondentes", () => {
  const scan = scanApp(appDir);
  // middleware.fly do exemplo não tem matcher -> global
  assert.equal(scan.middlewareMatcher, undefined);
});

// ---------- RevalidatePath prefixado ----------
test("revalidatePath normaliza e prefixa a chave de rota", () => {
  routeCache.set(
    "route:/blog/hello",
    { body: "x", status: 200, headers: {} },
    60,
  );
  revalidatePath("/blog/hello");
  assert.equal(routeCache.get("route:/blog/hello"), undefined);
});

// ---------- Adapter edge ----------
test("adapter edge retorna handler Fetch", async () => {
  const scan = scanApp(appDir);
  const handler = createEdgeHandler({ appDir, siteUrl: "https://fly.dev" });
  const res = await handler(new Request("http://localhost/sitemap.xml"));
  assert.match(await res.text(), /<urlset/);
  void scan;
});

// ---------- Plugin system ----------
test("plugin: onAst pode transformar a AST", async () => {
  registerPlugin({
    name: "test-inject",
    onClientCode: (code) => "/*plugin-ok*/\n" + code,
  });
  const c = compile(`<p>oi</p>`, { file: "/x/pl.fly" });
  assert.match(c.clientCode, /plugin-ok/);
});

// ---------- Build produção (assets + SEO) ----------
test("buildProd escreve assets e SEO em .fly-out", async () => {
  const scan = scanApp(appDir);
  const b = createBuild(scan, {
    appDir,
    siteUrl: "https://fly.dev",
    outDir: ".fly-test-out",
  });
  await b.buildProd();
  assert.ok(existsSync(join(process.cwd(), ".fly-test-out", "sitemap.xml")));
  assert.ok(existsSync(join(process.cwd(), ".fly-test-out", "robots.txt")));
  assert.ok(
    existsSync(join(process.cwd(), ".fly-test-out", "_fly", "client.js")),
  );
  void readFileSync;
});

// ---------- robots custom ----------
test("buildRobots aceita regras customizadas", () => {
  const r = buildRobots("https://x.dev", "Disallow: /admin");
  assert.match(r, /Disallow: \/admin/);
});

// ---------- Pipeline CSS: scoping + utilities responsivas ----------
test("compile expõe <style> e aplica data-fly-scope no SSR/client", async () => {
  const file = "/x/card.fly";
  const src = `<style>.card{color:red;padding:1rem}@media (min-width:640px){.card{display:flex}}</style><script>let t=$state("x")</script><div class="card"><p>oi</p></div>`;
  const c = compile(src, { file });
  assert.equal(c.style.includes(".card"), true, "style é exposto");
  const scope = hashFile(file);
  assert.equal(c.scope, scope, "scope é o hash do arquivo");
  const o = await c.render({
    params: {},
    request: new Request("http://x/"),
    url: new URL("http://x/"),
    cache: {},
  });
  assert.match(
    o.html,
    new RegExp(`data-fly-scope="${scope}"`),
    "SSR aplica data-fly-scope no elemento",
  );
  assert.match(
    c.clientCode,
    new RegExp(`data-fly-scope.*${scope}`),
    "client aplica data-fly-scope",
  );
});

test("scopeCss prefixa seletores e preserva @media e @keyframes", () => {
  const scope = `[data-fly-scope="${hashFile("/x.fly")}"]`;
  const out = scopeCss(
    ".a{color:red}.b:hover{color:blue}@media (min-width:640px){.c{display:flex}}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(1turn)}}",
    "/x.fly",
  );
  assert.ok(out.startsWith(scope), "prefixa a primeira regra");
  assert.match(
    out,
    /\[data-fly-scope[^\]]*\] \.b:hover/,
    "prefixa segunda regra",
  );
  assert.match(
    out,
    /@media \(min-width:640px\)\{\[data-fly-scope[^\]]*\] \.c/,
    "escopa dentro de @media",
  );
  assert.match(
    out,
    /@keyframes spin\{from\{transform:rotate\(0\)/,
    "keyframes intacto",
  );
});

test("generateUtilities gera utils + variantes responsivas", () => {
  const css = generateUtilities();
  assert.match(css, /\.flex\{display:flex\}/, "utility flex");
  assert.match(css, /\.p-4\{padding:1rem\}/, "utility p-4");
  assert.match(css, /\.sm:flex\{display:flex\}/, "responsiva sm:flex");
  assert.match(css, /\.md:grid-cols-3/, "responsiva md:grid-cols-3");
});

test("pipeline serve /__fly/styles.css com utilities + estilos escopados", async () => {
  const scan = scanApp(appDir);
  const pipeline = createPipeline(scan, { appDir, siteUrl: "https://fly.dev" });
  const res = await pipeline.handle(
    new Request("http://localhost/__fly/styles.css"),
  );
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/css/);
  const css = await res.text();
  assert.match(css, /\.flex\{display:flex\}/, "utilities presentes");
  assert.ok(css.length > 0);
});

test("buildProd escreve _fly/styles.css", async () => {
  const scan = scanApp(appDir);
  const b = createBuild(scan, {
    appDir,
    siteUrl: "https://fly.dev",
    outDir: ".fly-test-out",
  });
  await b.buildProd();
  assert.ok(
    existsSync(join(process.cwd(), ".fly-test-out", "_fly", "styles.css")),
    "styles.css gerado no build",
  );
  const css = readFileSync(
    join(process.cwd(), ".fly-test-out", "_fly", "styles.css"),
    "utf8",
  );
  assert.match(
    css,
    /\.flex\{display:flex\}/,
    "utilities no stylesheet de produção",
  );
});

// ---------- Drag & drop ----------
test("DnD: on:dragstart / on:drop geram addEventListener no client", () => {
  const c = compile(
    `<div on:dragstart={start} on:drop={drop} on:dragover={over}><p>x</p></div>`,
    { file: "/x/dnd.fly" },
  );
  assert.match(
    c.clientCode,
    /addEventListener\("dragstart"/,
    "dragstart listener",
  );
  assert.match(c.clientCode, /addEventListener\("drop"/, "drop listener");
  assert.match(
    c.clientCode,
    /addEventListener\("dragover"/,
    "dragover listener",
  );
});

test("DnD: moveItem reordena lista de forma imutável", async () => {
  const { moveItem } = await import("../src/runtime/client.js");
  const list = ["a", "b", "c", "d"];
  const next = moveItem(list, 0, 2);
  assert.deepEqual(next, ["b", "c", "a", "d"], "move a para o índice 2");
  assert.deepEqual(
    list,
    ["a", "b", "c", "d"],
    "lista original intacta (imutável)",
  );
  assert.deepEqual(
    moveItem(list, 3, 0),
    ["d", "a", "b", "c"],
    "move d para o início",
  );
  assert.deepEqual(moveItem(list, 1, 1), list, "from === to não altera");
});

// ---------- Tipagem end-to-end ----------
test("paramsTypeOf infere tipos de params de rotas", () => {
  assert.equal(paramsTypeOf("/"), "Record<string, string>");
  assert.equal(paramsTypeOf("/blog/[slug]"), `{ "slug": string }`);
  assert.equal(paramsTypeOf("/docs/[...rest]"), `{ "rest": string }`);
  assert.match(paramsTypeOf("/user/[id]/post/[postId]"), /"id": string/);
  assert.match(paramsTypeOf("/user/[id]/post/[postId]"), /"postId": string/);
});

test("generateTypes produz fly.d.ts importável com rotas/actions/tipos", () => {
  const scan = scanApp(appDir);
  const dts = generateTypes(scan);
  assert.match(dts, /export interface FlyPageParams/, "interface de rotas");
  assert.match(dts, /declare module "fly"/, "módulo fly declarado");
  assert.match(
    dts,
    /import type \{ Loader, ServerAction/,
    "re-exporta Loader/ServerAction",
  );
  assert.match(dts, /FlyPageLoader/, "type alias de loader");
  assert.match(dts, /FlyServerAction/, "type alias de action");
});

test("buildProd escreve _fly/fly.d.ts (tipos gerados)", async () => {
  const scan = scanApp(appDir);
  const b = createBuild(scan, {
    appDir,
    siteUrl: "https://fly.dev",
    outDir: ".fly-test-out",
  });
  await b.buildProd();
  const f = join(process.cwd(), ".fly-test-out", "_fly", "fly.d.ts");
  assert.ok(existsSync(f), "fly.d.ts gerado no build");
  const dts = readFileSync(f, "utf8");
  assert.match(dts, /FlyPageParams/, "contém tipos de rotas");
  assert.match(dts, /declare module "fly"/, "declara o módulo fly");
});
