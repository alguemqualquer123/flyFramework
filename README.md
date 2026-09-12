# Fly

Framework full-stack pra JS/TS com reatividade compilada. A ideia é simples: você escreve arquivos `.fly` e o compilador resolve o máximo possível em build, pra mandar pouco JS pro browser.

Inspirado em Svelte (sem Virtual DOM) com roteamento file-based tipo Next. SSR, SSG e ISR já funcionam, junto com API routes, server actions, middleware e SEO básico.

> Status: ainda experimental. Uso pra estudar e prototipar, não recomendo botar em produção agora.

## Requisitos

- Node 20+
- Nenhuma dependência externa pro core (só dev rodando com `node --test`)

## Começando

```bash
git clone https://github.com/alguemqualquer123/flyFramework.git
cd flyFramework

# dev (sobe em :3000 por padrão)
node src/cli/index.ts dev

# valida as rotas
node src/cli/index.ts check

# build estático -> .fly-out/
node src/cli/index.ts build

# roda o que foi pro build
node src/cli/index.ts start
```

Ou pra criar um app do zero em outra pasta:

```bash
node src/cli/index.ts init meu-app
node src/cli/index.ts create meu-app
node src/cli/index.ts add blog/[slug]
```

## Escrevendo uma página

Arquivo `app/index.fly`:

```html
<script>
  let count = $state(0)
  let nome = $state("Fly")

  export function meta() {
    return { title: "Home · " + nome, description: "Framework Fly demo" }
  }
</script>

<h1>Bem-vindo ao {nome}</h1>
<button on:click={count++}>Cliques: {count}</button>
<input bind:value={nome} placeholder="seu nome" />

<ul>
  <li for={n of [1, 2, 3, 4, 5]}>Item {n}</li>
</ul>
```

`$state` vira signal no client, o resto renderiza no servidor. `on:click`, `bind:value`, `for={}`, `if={}`, `class:active={}` já funcionam.

API route (`app/api/users.fly`):

```js
export function GET({ params }) {
  return { message: "Olá do servidor!" }
}
```

Server action (`app/actions/todo.fly`):

```js
"use server"

export async function addTodo(text) {
  return { ok: true, text }
}
```

No browser chama via POST `/__fly/action/ID` ou usando `<Form action={addTodo}>` (funciona sem JS também).

## Estrutura

```
src/
  compiler/    parser, analyzer, codegen (.fly -> JS)
  runtime/     signals, hidratação, islands, client-nav
  router/      scanner file-based + matcher ([slug], [...rest])
  core/        pipeline, build/SSG, css, security, adapters
  cache/       data (TTL+tags), route (ISR), revalidate
  seo/         head, sitemap
  cli/         dev, build, start, check, create, add, init
app/ ou examples/app/   suas páginas .fly
tests/         87 testes com node --test
bench/         bench de compile / SSR / memória
```

Roteamento é por pasta: `index.fly`, `blog/[slug].fly`, `api/*.fly`, mais os especiais `layout.fly`, `loading.fly`, `error.fly`, `404.fly` e `middleware.fly`.

## CLI

| Comando | O que faz |
|---|---|
| `dev` | sobe o server local com o pipeline completo |
| `build` | compila tudo e gera HTML estático + `_fly/*.js` + sitemap/robots em `.fly-out/` |
| `start` | serve o resultado do build |
| `check` | só compila pra ver se tem erro, sem subir nada |
| `create [nome]` | scaffold de exemplo |
| `add [rota]` | cria `page` ou `api/` nova |
| `init [dir]` | cria `fly.config.ts` + `package.json` + `tsconfig` base |

Config (`fly.config.ts`):

```ts
import { defineConfig } from "./src/core/config.ts";

export default defineConfig({
  appDir: new URL("./examples/app", import.meta.url).pathname,
  siteUrl: "https://fly.dev",
  adapter: "node", // node | edge | serverless
});
```

## Render e cache

- `export const render = "ssr" | "ssg" | "isr"` por página, ou `generateStaticParams()` pra SSG com params
- Cache em camadas: dado (`data.ts` com TTL e tags), rota cheia (ISR), `revalidateTag` / `revalidatePath`
- Endpoint manual: `POST /__fly/revalidate?tag=x` ou `?path=/blog/1`
- Streaming com `loading.fly` como shell + swap de `<template>`, e `<Await>` por componente (ver abaixo)
- Islands: `client:load`, `client:visible`, `client:idle`
- CSS scoped por componente (`<style>` vira `[data-fly-scope]`) + utilitárias tipo tailwind (`flex`, `grid`, `gap-*`, `sm:` etc) sem dependência

## HMR (dev)

`node src/cli/index.ts dev` sobe com watch em `.fly` + SSE em `/__fly/hmr`. Quando um arquivo muda, o server invalida o compilador, limpa o ISR e avisa o browser. O client primeiro tenta hot-swap (troca só o `#__fly` + CSS, mantendo signals e scroll); se a mudança for em lógica do client, cai pra recarga preservando estado via `sessionStorage`.

## Await por componente

```html
<Await promise={loadProduto(id)} let={p} fallback="Carregando...">
  <p>{p.nome} — R$ {p.preco}</p>
</Await>
```

No SSR sem streaming o HTML sai resolvido (bom pra SEO). Com `loading.fly` o server manda o shell com o fallback e cada `<Await>` resolvido chega como chunk que troca o `<template data-fly-await>`.

## i18n

```ts
export default defineConfig({
  appDir: "...",
  i18n: { defaultLocale: "pt", locales: ["pt", "en"] },
});
```

Dicionários em `app/i18n/pt.json`, `en.json`. No loader/template usa `t("hello", { name })` e `locale`. Detecção: prefixo `/en/...` > cookie `fly_locale` > `?lang=` > `Accept-Language`. No browser, `window.__FLY_LOCALE__` e `/__fly/i18n-client.js` (`getLocale`, `setLocale`).

## Banco embutido

```ts
import { defineModel, createDb } from "./src/core/db.ts";

const User = defineModel("users", { name: "string", email: "string unique", age: "number?" });
const db = createDb({ models: [User], path: "./app/db.json" });

db.models.users.create({ name: "Ana", email: "ana@x.dev" });
db.models.users.findMany({ age: 30 });
```

Valida tipo/obrigatório/unique, tem `findMany/findUnique/update/upsert/delete/count` e persiste em JSON. Pra começar rápido: `openAppDb(appDir, models)`.

## Auth

```ts
import { createAuth, UserModel } from "./src/core/auth.ts";

const auth = createAuth({ secret: process.env.AUTH_SECRET!, db });

// numa server action
export async function signup(data) {
  const { user, cookie } = await auth.register(data);
  return new Response(JSON.stringify({ user }), {
    headers: { "set-cookie": cookie, "content-type": "application/json" },
  });
}

// num loader de página privada
export async function loader({ request }) {
  const user = await auth.requireAuth(request); // redireciona pra /login se anônimo
  return { user };
}
```

Senha com scrypt + salt, sessão assinada em cookie `HttpOnly`. `auth.getUser(request)` retorna o usuário sem o hash, `auth.logoutCookie()` derruba a sessão.

## CI

Workflow em `.github/workflows/ci.yml`: `node --test` + `fly check` no Node 20 a cada push/PR em `main`.

## Tailwind opcional

```ts
export default defineConfig({
  appDir: "...",
  css: { tailwind: true, input: "./app/input.css" },
});
```

Se achar o binário `tailwindcss` no PATH ou em `node_modules/.bin`, usa ele de verdade e concatena com o CSS interno. Se não achar, cai pro interno sem quebrar o build.

## Testes

```bash
node --test
```

105 testes cobrindo compilador, pipeline, cache, segurança (session, csrf, rate limit), auth (register/login/sessão), layouts aninhados, slots, streaming + `<Await>`, HMR (hot-swap + fallback), i18n, ORM e tailwind. Tem fixture em `tests/fixtures/` e app de exemplo com loja em `examples/real-app` e `examples/site`.

Bench:

```bash
node bench/index.ts
```

Se quiser ajudar, abre issue ou manda PR. `fly check` + `node --test` antes de mandar já ajuda bastante.

## Licença

MIT — ver [LICENSE](./LICENSE).
