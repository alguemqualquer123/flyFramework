import { test } from "node:test";
import assert from "node:assert/strict";
import { scanApp } from "../src/router/scanner.ts";
import { createBuild } from "../src/core/build.ts";
import { createPipeline } from "../src/core/pipeline.ts";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const appDir = join(process.cwd(), "examples", "app");
const scan = scanApp(appDir);

test("SSG: pré-renderiza páginas estáticas e dinâmicas", async () => {
  const b = createBuild(scan, { appDir, siteUrl: "https://fly.dev" });
  await b.build();

  const index = readFileSync(
    join(process.cwd(), ".fly-out", "index.html"),
    "utf8",
  );
  assert.match(index, /Bem-vindo ao/);
  assert.match(index, /__flyMount/);

  const hello = readFileSync(
    join(process.cwd(), ".fly-out", "blog", "hello.html"),
    "utf8",
  );
  assert.match(hello, /Post hello/);
  assert.match(hello, /<title>Post hello<\/title>/);

  const contact = readFileSync(
    join(process.cwd(), ".fly-out", "contact.html"),
    "utf8",
  );
  assert.match(contact, /data-fly-action="addTodo"/);

  const mundo = readFileSync(
    join(process.cwd(), ".fly-out", "blog", "mundo.html"),
    "utf8",
  );
  assert.match(mundo, /Post mundo/);
});

test("pipeline ainda serve as rotas em runtime", async () => {
  const pipeline = createPipeline(scan, { appDir, siteUrl: "https://fly.dev" });
  const res = await pipeline.handle(new Request("http://localhost/blog/mundo"));
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Post mundo/);
});
