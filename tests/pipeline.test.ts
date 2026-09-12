import { test } from "node:test";
import assert from "node:assert/strict";
import { scanApp } from "../src/router/scanner.ts";
import { createPipeline } from "../src/core/pipeline.ts";
import { join } from "node:path";

const appDir = join(process.cwd(), "examples", "app");
const scan = scanApp(appDir);
const pipeline = createPipeline(scan, { appDir, siteUrl: "https://fly.dev" });

async function call(path: string, method = "GET", body?: any) {
  const req = new Request("http://localhost" + path, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return pipeline.handle(req);
}

test("GET / retorna HTML com conteúdo", async () => {
  const res = await call("/");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Bem-vindo ao/);
  assert.match(html, /__FLY_DATA__/);
});

test("GET /blog/:slug retorna conteúdo (streaming + SEO por document.title)", async () => {
  const res = await call("/blog/hello");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Conteúdo gerado para hello/);
  assert.match(html, /document\.title="Post hello"/, "title aplicado no client (streaming)");
  assert.doesNotMatch(html, /__FLY_HEAD__/, "head placeholder resolvido no streaming");
  assert.doesNotMatch(html, /__FLY_SCRIPTS__/, "scripts placeholder resolvido no streaming");
});

test("GET /api/users retorna JSON", async () => {
  const res = await call("/api/users");
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.length, 2);
});

test("POST /api/users cria recurso", async () => {
  const res = await call("/api/users", "POST", { name: "Caio" });
  assert.equal(res.status, 201);
  const json = await res.json();
  assert.ok(json.find((u: any) => u.name === "Caio"));
});

test("GET /sitemap.xml", async () => {
  const res = await call("/sitemap.xml");
  assert.match(await res.text(), /<urlset/);
});

test("404 para rota inexistente", async () => {
  const res = await call("/nao-existe");
  assert.equal(res.status, 404);
});

test("runtime client é servido", async () => {
  const res = await call("/__fly/client.js");
  assert.match(res.headers.get("content-type") ?? "", /javascript/);
  assert.match(await res.text(), /export function signal/);
});

test("middleware bloqueia /secret (403)", async () => {
  const res = await call("/secret");
  assert.equal(res.status, 403);
  assert.match(await res.text(), /Acesso negado/);
});

test("página de contato renderiza server action + Link", async () => {
  const res = await call("/contact");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /data-fly-action="addTodo"/);
  assert.match(html, /<a data-fly-link[^>]*href="\/"/);
});

test("index renderiza Image (lazy) e Link", async () => {
  const res = await call("/");
  const html = await res.text();
  assert.match(html, /<img[^>]+loading="lazy"/);
  assert.match(html, /<a data-fly-link[^>]*href="\/blog\/hello"/);
});

test("server action via POST /__fly/action/ID", async () => {
  const res = await call("/__fly/action/addTodo", "POST", ["ola"]);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.result.ok, true);
  assert.equal(json.result.text, "ola");
});

test("página 404 customizada", async () => {
  const res = await call("/inexistente");
  assert.equal(res.status, 404);
  const html = await res.text();
  assert.match(html, /404/);
  assert.match(html, /<a data-fly-link[^>]*href="\/"/);
});
