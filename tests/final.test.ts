import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compile,
  getCompiled,
  invalidateCompiled,
} from "../src/compiler/index.ts";
import { parseTemplate } from "../src/compiler/parser.ts";
import {
  createT,
  localeFromPath,
  resolveLocale,
  parseAcceptLanguage,
  localizedPath,
} from "../src/core/i18n.ts";
import { defineModel, createDb } from "../src/core/db.ts";
import {
  buildCss,
  tailwindAvailable,
  buildWithTailwind,
} from "../src/core/tailwind.ts";
import { createHmr } from "../src/core/hmr.ts";
import { scanApp } from "../src/router/scanner.ts";
import { createPipeline } from "../src/core/pipeline.ts";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

// ---------- HMR ----------
test("hmr: invalidateCompiled limpa o cache", () => {
  const dir = mkdtempSync(join(tmpdir(), "fly-hmr-"));
  const file = join(dir, "index.fly");
  writeFileSync(file, `<h1>um</h1>`);
  const a = getCompiled(file);
  writeFileSync(file, `<h1>dois</h1>`);
  const b = getCompiled(file);
  assert.equal(a, b, "sem invalidar, cache é reusado");
  invalidateCompiled(file);
  const c = getCompiled(file);
  assert.notEqual(b, c, "após invalidar, recompila");
});

test("hmr: broadcast chega nos clientes SSE", async () => {
  const hmr = createHmr("/tmp");
  const msgs: string[] = [];
  (hmr.clients as any).add({
    enqueue: (m: string) => msgs.push(m),
    close: () => {},
  });
  hmr.broadcast("/tmp/index.fly");
  assert.match(msgs.join(""), /index\.fly/);
});

test("hmr: pipeline serve /__fly/hmr como SSE", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fly-hmrpipe-"));
  writeFileSync(join(dir, "index.fly"), `<h1>oi</h1>`);
  const scan = scanApp(dir);
  const pipe = createPipeline(scan, { appDir: dir, dev: false } as any);
  const res = await pipe.handle(req("http://x/__fly/hmr"));
  assert.match(res.headers.get("content-type") ?? "", /text\/event-stream/);
});

test("hmr: client registra signals para snapshot", () => {
  const c = compile(`<script>let count = $state(0)</script><p>{count}</p>`);
  assert.match(c.clientCode, /__flyRegisterState/);
  assert.match(c.clientCode, /"count"/);
});

// ---------- Await / streaming por componente ----------
test("await: parser extrai promise/let/fallback", () => {
  const ast = parseTemplate(
    `<Await promise={load()} let={user} fallback="..."><p>{user}</p></Await>`,
  );
  assert.equal(ast.length, 1);
  assert.equal((ast[0] as any).type, "await");
  assert.equal((ast[0] as any).letName, "user");
});

test("await: SSR emite placeholder e resolve no HTML final", async () => {
  const c = compile(
    `<script>export async function loader() { return {} }</script><Await promise={Promise.resolve("ana")} let={nome} fallback="..."><p>ola {nome}</p></Await>`,
  );
  const out = await c.render({
    params: {},
    request: req("http://x/"),
    url: new URL("http://x/"),
    cache: {},
  } as any);
  assert.match(out.html, /data-fly-await="a0"/, "placeholder no html parcial");
  assert.ok(out.deferred && out.deferred.length === 1, "deferred registrado");
  const settled = await Promise.all(out.deferred!);
  assert.match(settled[0].html, /ola ana/);
});

test("await: pipeline sem streaming entrega HTML resolvido", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fly-await-"));
  writeFileSync(
    join(dir, "index.fly"),
    `<Await promise={Promise.resolve(42)} let={n} fallback="..."><p>valor {n}</p></Await>`,
  );
  const scan = scanApp(dir);
  const pipe = createPipeline(scan, { appDir: dir } as any);
  const res = await pipe.handle(req("http://x/", { "x-fly-nostream": "1" }));
  const html = await res.text();
  assert.match(html, /valor 42/);
  assert.doesNotMatch(html, /data-fly-await/, "placeholder trocado");
});

test("await: client usa mountAwait", () => {
  const c = compile(`<Await promise={p} let={d}><p>{d}</p></Await>`);
  assert.match(c.clientCode, /mountAwait/);
});

// ---------- i18n ----------
test("i18n: t com fallback e interpolação", () => {
  const t = createT(
    "en",
    { en: { hi: "Hello {name}" }, pt: { hi: "Olá {name}", bye: "Tchau" } },
    "pt",
  );
  assert.equal(t("hi", { name: "Ana" }), "Hello Ana");
  assert.equal(t("bye"), "Tchau", "cai pro fallback");
  assert.equal(t("missing"), "missing");
});

test("i18n: localeFromPath e negotiate", () => {
  assert.deepEqual(localeFromPath("/en/sobre", ["pt", "en"]), {
    locale: "en",
    path: "/sobre",
  });
  assert.deepEqual(localeFromPath("/sobre", ["pt", "en"]), {
    locale: null,
    path: "/sobre",
  });
  assert.deepEqual(parseAcceptLanguage("en-US,en;q=0.9,pt;q=0.8"), [
    "en",
    "en",
    "pt",
  ]);
  const r = resolveLocale(
    req("http://x/", { "accept-language": "pt-BR,pt;q=0.9" }),
    { defaultLocale: "en", locales: ["en", "pt"] },
  );
  assert.equal(r, "pt");
});

test("i18n: pipeline respeita prefixo /en", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fly-i18n-"));
  mkdirSync(join(dir, "i18n"), { recursive: true });
  writeFileSync(join(dir, "i18n", "pt.json"), JSON.stringify({ hello: "Olá" }));
  writeFileSync(
    join(dir, "i18n", "en.json"),
    JSON.stringify({ hello: "Hello" }),
  );
  writeFileSync(
    join(dir, "index.fly"),
    `<script>export function loader({ t }) { return { msg: t("hello") } }</script><p>{data.msg}</p>`,
  );
  const scan = scanApp(dir);
  const pipe = createPipeline(scan, {
    appDir: dir,
    i18n: { defaultLocale: "pt", locales: ["pt", "en"] },
  } as any);
  const pt = await (await pipe.handle(req("http://x/"))).text();
  const en = await (await pipe.handle(req("http://x/en"))).text();
  assert.match(pt, /Ol/);
  assert.match(en, /Hello/);
});

test("i18n: localizedPath omite default", () => {
  const cfg = { defaultLocale: "pt", locales: ["pt", "en"] };
  assert.equal(localizedPath("/sobre", "pt", cfg), "/sobre");
  assert.equal(localizedPath("/sobre", "en", cfg), "/en/sobre");
});

// ---------- ORM ----------
test("db: crud básico em memória", () => {
  const User = defineModel("users", { name: "string", age: "number?" });
  const db = createDb({ models: [User] });
  const a = db.models.users.create({ name: "Ana", age: 30 });
  assert.ok(a.id);
  assert.equal(db.models.users.count(), 1);
  assert.equal(db.models.users.findUnique({ id: a.id })?.name, "Ana");
  db.models.users.update({ id: a.id }, { age: 31 });
  assert.equal(db.models.users.findFirst({ name: "Ana" })?.age, 31);
  assert.equal(db.models.users.delete({ id: a.id }), true);
  assert.equal(db.models.users.count(), 0);
});

test("db: valida tipo e obrigatório", () => {
  const M = defineModel("m", { name: "string", age: "number" });
  const db = createDb({ models: [M] });
  assert.throws(() => db.models.m.create({ age: 1 } as any), /obrigat/);
  assert.throws(
    () => db.models.m.create({ name: "x", age: "n" } as any),
    /Tipo inv/,
  );
});

test("db: unique e upsert", () => {
  const M = defineModel("u", { email: "string unique", name: "string?" });
  const db = createDb({ models: [M] });
  db.models.u.create({ email: "a@x.dev" });
  assert.throws(() => db.models.u.create({ email: "a@x.dev" }), /duplicado/);
  const up = db.models.u.upsert({ email: "b@x.dev" }, { name: "B" });
  assert.equal(up.name, "B");
  assert.equal(db.models.u.count(), 2);
});

test("db: persiste em arquivo", () => {
  const dir = mkdtempSync(join(tmpdir(), "fly-db-"));
  const M = defineModel("t", { v: "string" });
  const db = createDb({ models: [M], path: join(dir, "db.json") });
  db.models.t.create({ v: "1" });
  const db2 = createDb({ models: [M], path: join(dir, "db.json") });
  assert.equal(db2.models.t.count(), 1);
});

// ---------- Tailwind standalone ----------
test("tailwind: sem binário faz fallback pro interno", () => {
  assert.equal(tailwindAvailable("/binario/que/nao/existe-123"), false);
  assert.equal(
    buildWithTailwind({ binary: "/binario/que/nao/existe-123" }),
    null,
  );
});

test("tailwind: buildCss devolve engine internal quando desligado", () => {
  const dir = mkdtempSync(join(tmpdir(), "fly-tw-"));
  writeFileSync(
    join(dir, "index.fly"),
    `<style>.a{color:red}</style><h1>oi</h1>`,
  );
  const scan = scanApp(dir);
  const { css, engine } = buildCss(scan, () => "", { tailwind: false });
  assert.equal(engine, "internal");
  assert.match(css, /flex|block/);
});
