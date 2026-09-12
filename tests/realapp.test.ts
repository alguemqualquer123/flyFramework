import { test } from "node:test";
import assert from "node:assert/strict";
import { scanApp } from "../src/router/scanner.ts";
import { createPipeline } from "../src/core/pipeline.ts";
import { join } from "node:path";

const appDir = join(process.cwd(), "examples", "real-app");
const scan = scanApp(appDir);
const pipeline = createPipeline(scan, {
  appDir,
  siteUrl: "https://loja.fly.dev",
});

async function call(path: string) {
  return pipeline.handle(new Request("http://localhost" + path));
}

test("real-app: home lista 50 produtos (SSR + loader + cache)", async () => {
  const res = await call("/");
  const html = await res.text();
  assert.match(html, /Catálogo/);
  // 50 <li> gerados no server
  const count = (html.match(/<li>/g) ?? []).length;
  assert.equal(count, 50);
  assert.match(html, /R\$ 10/);
});

test("real-app: detalhe de produto com SEO", async () => {
  const res = await call("/products/7");
  const html = await res.text();
  assert.match(html, /Produto 7/);
  assert.match(html, /<title>Produto 7<\/title>/);
});

test("real-app: API de produtos", async () => {
  const res = await call("/api/products");
  const json = await res.json();
  assert.equal(json.length, 50);
});

test("real-app: classe condicional aplicada", async () => {
  const res = await call("/");
  const html = await res.text();
  // preço > 300 recebe classe destaque (ids 30..49 => 310..500)
  assert.match(html, /class="destaque"/);
});
