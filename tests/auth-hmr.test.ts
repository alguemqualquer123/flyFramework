import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createAuth,
  hashPassword,
  verifyPassword,
  UserModel,
} from "../src/core/auth.ts";
import { createDb } from "../src/core/db.ts";
import { createHmr } from "../src/core/hmr.ts";
import { routeCache } from "../src/cache/route.ts";
import { FlyRedirect } from "../src/core/utils.ts";

function authedDb() {
  const db = createDb({ models: [UserModel] });
  const auth = createAuth({ secret: "segredo-teste-123", db: db as any });
  return { db, auth };
}

// ---------- auth ----------
test("auth: register cria usuário sem expor senha", async () => {
  const { auth } = authedDb();
  const { user, cookie } = await auth.register({
    name: "Ana",
    email: "Ana@x.dev",
    password: "1234",
  });
  assert.equal(user.email, "ana@x.dev");
  assert.ok(!(user as any).password, "hash não vaza");
  assert.match(cookie, /fly_session=/);
});

test("auth: register rejeita email duplicado e senha curta", async () => {
  const { auth } = authedDb();
  await auth.register({ email: "a@x.dev", password: "1234" });
  await assert.rejects(
    () => auth.register({ email: "a@x.dev", password: "1234" }),
    /já cadastrado/,
  );
  await assert.rejects(
    () => auth.register({ email: "b@x.dev", password: "12" }),
    /curta/,
  );
  await assert.rejects(
    () => auth.register({ email: "invalido", password: "1234" }),
    /inválido/,
  );
});

test("auth: login + getUser via cookie", async () => {
  const { auth } = authedDb();
  await auth.register({ email: "u@x.dev", password: "abcd" });
  const { cookie, user } = await auth.login({
    email: "u@x.dev",
    password: "abcd",
  });
  const value = cookie.split(";")[0].split("=")[1];
  const me = await auth.getUser(
    new Request("http://x/", { headers: { cookie: `fly_session=${value}` } }),
  );
  assert.equal(me?.email, user.email);
  await assert.rejects(
    () => auth.login({ email: "u@x.dev", password: "errada" }),
    /inválidos/,
  );
});

test("auth: sessão adulterada não autentica", async () => {
  const { auth } = authedDb();
  await auth.register({ email: "t@x.dev", password: "abcd" });
  const me = await auth.getUser(
    new Request("http://x/", {
      headers: { cookie: "fly_session=lixo.adulterado" },
    }),
  );
  assert.equal(me, null);
});

test("auth: requireAuth redireciona anônimo pro login", async () => {
  const { auth } = authedDb();
  await assert.rejects(
    () => auth.requireAuth(new Request("http://x/privado")),
    (e) => e instanceof FlyRedirect,
  );
  assert.equal(
    auth.logoutCookie(),
    "fly_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );
});

test("auth: hash é salgado e verifica", () => {
  const h1 = hashPassword("mesma");
  const h2 = hashPassword("mesma");
  assert.notEqual(h1, h2, "salt diferente");
  assert.equal(verifyPassword("mesma", h1), true);
  assert.equal(verifyPassword("outra", h1), false);
});

// ---------- hmr hot-swap ----------
test("hmr: client tenta hot-swap antes do reload", () => {
  const src = readFileSync(
    new URL("../src/runtime/hmr-client.js", import.meta.url),
    "utf8",
  );
  assert.match(src, /hotSwap/, "tem hot-swap");
  assert.match(src, /location\.reload/, "mantém fallback com reload");
  assert.match(src, /__flySnapshotState/, "preserva signals");
});

test("hmr: mudança de .fly limpa o cache de rota", () => {
  const hmr = createHmr("/tmp");
  routeCache.set("route:/x", { body: "velho", status: 200, headers: {} }, 60);
  hmr.onFileChanged("/tmp/pages/index.fly");
  assert.equal(routeCache.get("route:/x"), undefined, "ISR bustado no HMR");
});

test("hmr: arquivo não-.fly é ignorado", () => {
  const hmr = createHmr("/tmp");
  routeCache.set("route:/y", { body: "ok", status: 200, headers: {} }, 60);
  hmr.onFileChanged("/tmp/style.css");
  assert.ok(routeCache.get("route:/y"), "só .fly invalida");
});
