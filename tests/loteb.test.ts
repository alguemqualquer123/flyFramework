// Lote B — testes dos recursos restantes que ainda não tinham cobertura dedicada:
// security/rate-limit, catch-all, slots, layouts aninhados, transition, streaming e CLI init.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { compile } from "../src/compiler/index.ts";
import { scanApp, toRoute, toRegex } from "../src/router/scanner.ts";
import { createPipeline } from "../src/core/pipeline.ts";
import {
  Session,
  createSessionStore,
  rateLimit,
  rateLimitClient,
  csrfToken,
  verifyCsrf,
} from "../src/core/security.ts";

const ROOT = process.cwd();
const appDir = join(ROOT, "tests", "fixtures", "loteb-app");
const scan = scanApp(appDir);
const pipeline = createPipeline(scan, { appDir, siteUrl: "https://x.dev" });

function req(path: string, init?: RequestInit) {
  return new Request("http://localhost" + path, init);
}

// ---------- Security: sessions assinadas ----------
test("security: Session toCookie/fromCookie roundtrip preserva dados", () => {
  const secret = "s3cr3t";
  const s = new Session(secret);
  s.set("user", "caio");
  s.set("role", "admin");
  const cookie = s.toCookie();
  const back = Session.fromCookie(cookie, secret);
  assert.ok(back, "cookie válido é lido de volta");
  assert.equal(back!.get("user"), "caio");
  assert.equal(back!.get("role"), "admin");
  assert.equal(s.get("user"), "caio", "set reflete no próprio objeto");
});

test("security: Session rejeita cookie adulterado e segredo errado", () => {
  const secret = "segredo";
  const s = new Session(secret);
  s.set("user", "ana");
  const cookie = s.toCookie();
  // adulterando o payload (muda o JSON sem re-assinar)
  const [payload, sig] = cookie.split(".");
  const tampered = Buffer.from("{\"user\":\"evil\"}").toString("base64url") + "." + sig;
  assert.equal(Session.fromCookie(tampered, secret), null, "payload adulterado é rejeitado");
  assert.equal(Session.fromCookie(cookie, "outro-segredo"), null, "segredo errado é rejeitado");
  // formato inválido
  assert.equal(Session.fromCookie("sem-ponto", secret), null);
});

test("security: createSessionStore gera cookie com HttpOnly/SameSite e lê via request", () => {
  const store = createSessionStore("k");
  const session = store.createSession({ n: 1 });
  const header = store.cookieHeader(session, { maxAge: "3600" });
  assert.match(header, /fly_session=/);
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Max-Age=3600/);
  const read = store.getSession(req("/", { headers: { cookie: header } }));
  assert.ok(read, "lê a sessão de volta a partir do header");
  assert.equal(read!.get("n"), 1);
});

test("security: rateLimit respeita janela e limite", () => {
  // janela curta para não ralentizar o teste
  const r1 = rateLimit("rl-test-1", { limit: 3, windowMs: 50 });
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);
  assert.equal(rateLimit("rl-test-1", { limit: 3, windowMs: 50 }).allowed, true);
  assert.equal(rateLimit("rl-test-1", { limit: 3, windowMs: 50 }).allowed, true);
  const r4 = rateLimit("rl-test-1", { limit: 3, windowMs: 50 });
  assert.equal(r4.allowed, false, "4a requisição dentro da janela é bloqueada");
  assert.equal(r4.remaining, 0);
});

test("security: rateLimitClient usa IP (x-forwarded-for)", () => {
  const res = rateLimitClient(req("/api", { headers: { "x-forwarded-for": "203.0.113.9" } }), { limit: 1000 });
  assert.equal(res.key, "rl:203.0.113.9:http://localhost/api");
  assert.equal(res.allowed, true);
});

test("security: csrfToken/verifyCsrf validam o token literal do cookie", () => {
  const withCookie = req("/", { headers: { cookie: "fly_csrf=tok123" } });
  assert.equal(csrfToken(withCookie), "tok123", "devolve o token já presente no cookie");
  // sem cookie, gera um novo valor (aleatório)
  assert.ok(csrfToken(req("/")).length > 0);
  assert.equal(verifyCsrf(withCookie, "tok123"), true, "token bate com o cookie");
  assert.equal(verifyCsrf(withCookie, "outro"), false, "token diferente é rejeitado");
  assert.equal(verifyCsrf(req("/"), "tok123"), false, "sem cookie no request, rejeita");
});

// ---------- Catch-all ----------
test("catch-all: toRoute/[slug]/[...rest] convertem para params regex", () => {
  assert.equal(toRoute("docs/[...rest].fly"), "/docs/:rest*");
  assert.equal(toRoute("blog/[slug].fly"), "/blog/:slug");
  const { regex, paramNames } = toRegex("/docs/:rest*");
  assert.deepEqual(paramNames, ["rest"], "param nome limpo, sem *");
  assert.ok(regex.test("/docs/a/b/c"));
});

test("catch-all: scanApp + pipeline resolve params.rest multi-segmento", async () => {
  const page = scan.pages.find((p) => p.route === "/docs/:rest*");
  assert.ok(page, "catch-all detectado como rota");
  assert.deepEqual(page!.paramNames, ["rest"]);
  const res = await pipeline.handle(req("/docs/a/b/c", { headers: { "x-fly-nostream": "1" } }));
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /CATCH:a\/b\/c/, "params.rest captura multissegmentos");
});

// ---------- Layouts aninhados ----------
test("layouts: scanner mapeia layout de raiz para / e aninhado para o diretório", () => {
  const routes = scan.layouts.map((l) => l.route);
  assert.ok(routes.includes("/"), "layout raiz é /");
  assert.ok(routes.includes("/blog"), "layout aninhado é /blog");
});

test("layouts: pipeline envolve a página com cadeia aninhada (raiz + blog)", async () => {
  const res = await pipeline.handle(req("/blog/xyz", { headers: { "x-fly-nostream": "1" } }));
  const html = await res.text();
  // cadeia de dentro para fora: blog -> raiz
  assert.ok(html.indexOf("BLOG-HDR") < html.indexOf("Blog POST:xyz"), "header do blog antes do conteúdo");
  assert.ok(html.indexOf("Blog POST:xyz") < html.indexOf("BLOG-FTR"), "conteúdo antes do footer do blog");
  assert.match(html, /<html lang="pt">/, "layout raiz envolve o todo");
  assert.match(html, /BLOG-NAV/, "nav do layout aninhado presente");
});

test("layouts: página fora do diretório não herda o layout aninhado", async () => {
  const res = await pipeline.handle(req("/", { headers: { "x-fly-nostream": "1" } }));
  const html = await res.text();
  assert.doesNotMatch(html, /BLOG-HDR/, "root não tem header do layout /blog");
  assert.match(html, /<\/html>/, "raiz ainda aplicada");
});

// ---------- Slots ----------
test("slots: slot default recebe slotContent no SSR", async () => {
  const c = compile(`<div><slot/></div>`, { file: "/x/comp.fly" });
  const out = await c.render({ params: {}, request: req("/"), url: new URL("http://x/"), cache: {}, slotContent: "INNER" });
  assert.match(out.html, /<div>INNER<\/div>/);
  assert.match(c.clientCode, /slotContent/, "client também trata o slot");
});

test("slots: slot nomeado recebe do mapa slots", async () => {
  const c = compile(`<div><slot name="titulo"/></div>`, { file: "/x/comp2.fly" });
  const out = await c.render({ params: {}, request: req("/"), url: new URL("http://x/"), cache: {}, slots: { titulo: "T-NAMED" } });
  assert.match(out.html, /<div>T-NAMED<\/div>/);
  assert.match(c.clientCode, /slots\['titulo'\]|slots\["titulo"\]/, "client lê slot nomeado");
});

// ---------- Transition ----------
test("transition: directive gera bindTransition no client", async () => {
  const c = compile(`<div transition:fade>oi</div>`, { file: "/x/t.fly" });
  assert.match(c.clientCode, /bindTransition\(__el, "fade"\)/);
});

test("transition: tipo padrão fade quando vazio após ':'", async () => {
  const c = compile(`<div transition:>oi</div>`, { file: "/x/t2.fly" });
  assert.match(c.clientCode, /bindTransition\(__el, "fade"\)/);
});

test("transition: não vaza para o SSR (atributo não emitido no HTML)", async () => {
  const c = compile(`<div transition:zoom>oi</div>`, { file: "/x/t3.fly" });
  const out = await c.render({ params: {}, request: req("/"), url: new URL("http://x/"), cache: {} });
  assert.doesNotMatch(out.html, /transition/, "SSR não emite o atributo transition");
});

// ---------- Streaming ----------
test("streaming: GET com loading boundary serve shell + template de troca", async () => {
  const res = await pipeline.handle(req("/blog/xyz"));
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /LOADING-BOUNDARY/, "shell de loading presente no primeiro chunk");
  assert.match(html, /id="__fly_real"/, "template com o conteúdo real presente");
  assert.match(html, /Blog POST:xyz/, "conteúdo real renderizado no template");
  assert.match(html, /document\.title=/, "title aplicado no client");
  assert.doesNotMatch(html, /__FLY_HEAD__/, "head placeholder resolvido");
  assert.doesNotMatch(html, /__FLY_SCRIPTS__/, "scripts placeholder resolvido");
});

test("streaming: nestream desativa streaming e entrega HTML completo com SEO no head", async () => {
  const res = await pipeline.handle(req("/blog/xyz", { headers: { "x-fly-nostream": "1" } }));
  const html = await res.text();
  assert.doesNotMatch(html, /LOADING-BOUNDARY/, "sem shell de loading");
  assert.doesNotMatch(html, /__fly_real/, "sem template de troca");
  assert.match(html, /<h1>Blog POST:xyz<\/h1>/, "conteúdo direto no DOM");
});

// ---------- CLI init / create ----------
function runCli(args: string[], cwd = ROOT) {
  return spawnSync(process.execPath, ["src/cli/index.ts", ...args], { cwd, encoding: "utf8" });
}

test("CLI: init cria esqueleto de projeto (config, tsconfig, package, app)", () => {
  const dir = mkdtempSync(join(tmpdir(), "fly-init-"));
  try {
    const r = runCli(["init", dir]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Projeto inicializado/, "mensagem de sucesso");
    assert.ok(existsSync(join(dir, "fly.config.ts")), "fly.config.ts");
    assert.ok(existsSync(join(dir, "tsconfig.json")), "tsconfig.json");
    assert.ok(existsSync(join(dir, "package.json")), "package.json");
    assert.ok(existsSync(join(dir, "app")), "dir app");
    const cfg = readFileSync(join(dir, "fly.config.ts"), "utf8");
    assert.match(cfg, /defineConfig/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: create (scaffold) gera páginas/API/actions", () => {
  const dir = mkdtempSync(join(tmpdir(), "fly-create-"));
  try {
    const r = runCli(["create", dir]);
    assert.equal(r.status, 0, r.stderr);
    for (const f of ["index.fly", "about.fly", "layout.fly"]) {
      assert.ok(existsSync(join(dir, f)), "arquivo " + f);
    }
    assert.ok(existsSync(join(dir, "api", "hello.fly")), "api/hello.fly");
    assert.ok(existsSync(join(dir, "actions", "todo.fly")), "actions/todo.fly");
    assert.match(readFileSync(join(dir, "index.fly"), "utf8"), /\$state\(0\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
