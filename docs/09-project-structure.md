# Estrutura de Pastas — Implementada

O framework **Fly** está funcional. Estrutura real em `src/`:

```
flyFramework/
├── docs/                      # planejamento (esta wiki)
│   00..10 *.md
├── src/
│   ├── compiler/
│   │   ├── lexer.ts           # (tokenização via parser)
│   │   ├── parser.ts          # template .fly -> AST (tags, attrs, if/for/slot)
│   │   ├── analyzer.ts        # extrai $state, loader, meta, api (chaves balanceadas)
│   │   ├── codegen.ts         # gera SSR (HTML) + client (signals)
│   │   └── index.ts           # compile(): entrypoint público
│   ├── runtime/
│   │   ├── client.js          # runtime do browser (signal/effect/h/hIf/hFor/bind*)
│   │   ├── actions-client.js  # revalidateTag no browser (server actions)
│   │   ├── client-nav.js      # navegação SPA (Link data-fly-link)
│   │   └── server.ts          # escapeHtml / escapeAttr
│   ├── router/
│   │   ├── scanner.ts         # descobre rotas (pages/apis/layouts/loadings/errors/actions/middleware)
│   │   └── matcher.ts         # casa path -> params
│   ├── cache/
│   │   ├── data.ts            # camada 1: TTL + tags
│   │   ├── route.ts           # camada 2: resposta HTTP (ISR)
│   │   └── revalidate.ts      # revalidateTag / revalidatePath
│   ├── seo/
│   │   ├── head.ts            # <title>/meta/OG/Twitter/JSON-LD
│   │   └── sitemap.ts         # sitemap.xml + robots.txt
│   ├── core/
│   │   ├── pipeline.ts        # router->middleware->loader->render->cache->response (+ actions, streaming)
│   │   ├── build.ts           # SSG: createBuild(scan, opts) -> .fly-out/
│   │   ├── config.ts          # defineConfig()
│   │   └── adapters/node.ts   # http.createServer
│   └── cli/
│       └── index.ts           # fly dev | build | start | check
├── examples/
│   ├── app/                   # app demo (Home, Blog, API users, contact+actions, middleware, loading, error, 404)
│   └── real-app/              # loja (catálogo 50 itens, detalhe, API)
├── tests/                     # node:test (31 testes passando)
├── bench/                     # benchmarks (compile/SSR/memória/cache/bundle)
├── fly.config.ts
├── package.json
└── tsconfig.json
```

## Como rodar

```bash
node src/cli/index.ts dev       # servidor em http://localhost:3000
node src/cli/index.ts build     # SSG: pré-renderiza .fly-out/ (HTML + client)
node src/cli/index.ts check     # type/compile check de todas as rotas
node --test "tests/*.test.ts"   # 31 testes
node --expose-gc bench/index.ts # benchmarks
```

## Sintaxe `.fly` (funcional)

```fly
<script>
  let count = $state(0)
  export async function loader({ cache }) { return cache.fetch("k", () => data, {ttl:30}) }
</script>

<button on:click={count++}>Cliques: {count}</button>
<p class:active={count > 3}>Texto</p>
<ul><li for={n of [1,2,3]}>#{n}</li></ul>
<input bind:value={nome} />
<Link href="/blog">Ver</Link>
<Image src="/logo.png" alt="logo" />
```

Diretivas: `on:event`, `bind:value`, `class:x`, `style:x`, `if={}`, `for={}`.
Server-only: `loader`, `meta`, `export const render`, `generateStaticParams`, `middleware`, API `GET/POST/...`.
Server actions: arquivo com `"use server"` + `export async function foo(...)`. Chamar no client via `window.__flyActions.foo(...)`.
