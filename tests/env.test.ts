import { test } from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compiler/index.ts";
import { parseEnv, publicEnv, loadEnvFiles } from "../src/core/env.ts";

test("parseEnv: linhas, comentários e aspas", () => {
  const e = parseEnv(`# comentário
PUBLIC_NAME=Fly
SECRET=abc123
QUOTED="valor com espaco"
EMPTY=`);
  assert.equal(e.PUBLIC_NAME, "Fly");
  assert.equal(e.SECRET, "abc123");
  assert.equal(e.QUOTED, "valor com espaco");
  assert.equal(e.EMPTY, "");
});

test("publicEnv: filtra apenas PUBLIC_", () => {
  const p = publicEnv({ PUBLIC_A: "1", SECRET: "x", PUBLIC_B: "2" });
  assert.deepEqual(p, { PUBLIC_A: "1", PUBLIC_B: "2" });
});

test("client: inlining de PUBLIC_ e ofuscação de segredos", () => {
  const src = `<script>let nome = $state("x")</script><p>{import.meta.env.PUBLIC_SITE} {process.env.SECRET}</p>`;
  const c = compile(src, { publicEnv: { PUBLIC_SITE: "FlyBlog" } });
  assert.match(c.clientCode, /FlyBlog/);
  assert.doesNotMatch(c.clientCode, /SECRET/);
  assert.match(c.clientCode, /undefined/); // SECRET vazou como undefined no client
});

test("SSR: import.meta.env disponível no server (inclui process.env)", async () => {
  process.env.PUBLIC_FROM_PROC = "proc-val";
  const c = compile(
    `<script></script><p>{import.meta.env.PUBLIC_FROM_PROC}</p>`,
  );
  const out = await c.render({
    params: {},
    request: new Request("http://x/"),
    url: new URL("http://x/"),
    cache: {},
    env: { PUBLIC_FROM_PROC: "proc-val" },
  });
  assert.match(out.html, /proc-val/);
  delete process.env.PUBLIC_FROM_PROC;
});

test("loadEnvFiles: lê .env de um diretório", async () => {
  // usa temp dir
  const os = await import("node:os");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fly-env-"));
  fs.writeFileSync(path.join(dir, ".env"), "PUBLIC_X=ok\nPRIV=y\n");
  const e = loadEnvFiles(dir);
  assert.equal(e.PUBLIC_X, "ok");
  assert.equal(e.PRIV, "y");
  fs.rmSync(dir, { recursive: true, force: true });
});
