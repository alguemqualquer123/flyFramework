# Roadmap — Status

## Fase 0 — Planejamento ✅
- [x] Visão, arquitetura, reatividade, roteamento, render, backend, seo, cache, cli

## Fase 1 — Compiler MVP ✅
- [x] `parser.ts` (AST de templates com if/for/slot/attrs dinâmicos)
- [x] `analyzer.ts` (estado reativo, loader/meta/api, config)
- [x] `codegen.ts` (SSR + client signals)
- [x] `index.ts` (compile)

## Fase 2 — Runtime ✅
- [x] `runtime/client.js` (signal/effect/h/hIf/hFor/bind*)
- [x] `runtime/server.ts` (escape)
- [x] Hidratação seletiva (apenas nós interativos)

## Fase 3 — Router & Pipeline ✅
- [x] `scanner.ts` (descoberta file-based)
- [x] `matcher.ts` (params dinâmicos)
- [x] `pipeline.ts` (middleware→loader→render→cache→response)
- [x] `adapters/node.ts`

## Fase 4 — Backend & Cache ✅
- [x] API routes (GET/POST/...)
- [x] `data.ts` (TTL + tags), `route.ts` (ISR), `revalidate.ts`

## Fase 5 — SEO & CLI ✅
- [x] `head.ts`, `sitemap.ts`
- [x] `cli/index.ts` (dev/build/start/check)

## Fase 6 — Exemplo, Testes, Benchmarks ✅
- [x] `examples/app` (demo)
- [x] `examples/real-app` (loja, 50 produtos, API)
- [x] `tests/` — 24 testes (compiler, cache, pipeline, real-app)
- [x] `bench/` — compile / SSR / memória / cache / server components / bundle

## Próximos passos (não implementados)
- [ ] `.fly.server` (server components explícitos com boundary)
- [ ] Streaming/Suspense real (chunked transfer) — *básico implementado: shell + swap de `<template>` via streaming do ReadableStream*
- [ ] Adapters edge/serverless
- [ ] HMR avançado e fast-refresh
- [ ] Build para produção (minify, code-splitting de rotas)

## Fase 7 — Next.js parity (implementado nesta sessão) ✅
- [x] Middleware global (`middleware.fly`): `export async function middleware({ request, next })`, pode retornar `Response` para bloquear
- [x] Server actions (`"use server"`): módulos com ações → registry por id; client gera stubs `globalThis.__flyActions[name]`; POST `/__fly/action/ID` executa no server; `revalidateTag`/`revalidatePath`/`redirect`/`notFound` disponíveis dentro da action
- [x] `loading.fly` (fallback de streaming) e `error.fly` (boundary de erro)
- [x] Página `404.fly` customizada (rota `/404`)
- [x] Componentes embutidos `Link` (`<a data-fly-link>`) e `Image` (`<img loading="lazy">`) com resolução no compiler
- [x] SSG: `generateStaticParams()` + `fly build` → pré-renderiza HTML estático em `.fly-out/` (`src/core/build.ts`)
- [x] `runtime/actions-client.js` (revalidate no browser) e `runtime/client-nav.js` (SPA navigation)
- [x] `src/core/build.ts` (SSG), `createBuild(scan, opts)`, cli `fly build`
- [x] APIs de cache: `/__fly/revalidate?tag=` (POST) revalida tags
- [x] `fly check` valida todas as rotas (pages/apis/layouts/loading/error/actions/middleware)
- [x] 31 testes (compiler, cache, pipeline, real-app, build/SSG, middleware, actions, Link/Image, 404)

## Fase 8 — Itens implementados nesta sessão ✅
- [x] **Formulários progressivos**: `<Form action={serverAction}>` → `<form data-fly-form data-fly-action>`, funciona sem JS (POST nativo) e com JS faz XHR à action + swap SPA; FormData preserva chaves; trata redirect/revalidate/erro
- [x] **Partial hydration / Islands**: `client:load`, `client:visible`, `client:idle` → SSR emite `<template data-fly-island>`, client monta via `mountIsland`+`dispatchIslands` (IntersectionObserver/requestIdleCallback)
- [x] **Suspense**: componente embutido, SSR renderiza conteúdo real, client monta via `mountSuspense`
- [x] **Prefetch real + View transitions**: prefetch do partial em cache (`__flyPrefetchCache`) alimenta a navegação SPA; `client-nav.js` usa `startViewTransition` com fallback
- [x] **Middleware com matcher**: `export const matcher = [...]` no middleware.fly limita a execução por path (glob → regex)
- [x] **Middlewares em cadeia**: scanner coleta `middleware.fly` raiz + arquivos em `app/middleware/*.fly` (lista `middlewares` ordenada), pipeline executa a cadeia em ordem no pipeline.ts:268 (`next`/bloqueio por `Response`/403)
- [x] **ISR por parâmetro + revalidate por path**: corrigido prefixo `route:` no `revalidatePath`; endpoint `/__fly/revalidate?path=` revalida HTML de rota específica
- [x] **Adapters edge/serverless**: `src/core/adapters/edge.ts` e `serverless.ts` (Fetch handler, pipeline 100% web-standard)
- [x] **Build de produção**: `buildProd` escreve assets `_fly/*.js` + `sitemap.xml` + `robots.txt` no `.fly-out` (+ minify opcional via config)
- [x] **CLI scaffolding**: `fly create [nome]`, `fly add [rota]` (page/api)
- [x] **Plugin system**: `registerPlugin` (transformSource/onAst/onClientCode hooks) aplicado no `compile()`
- [x] **robots.txt customizado**: `config.robots` aceita regras extras
- [x] 10 testes novos de features → 57 testes no total (todos verdes; corrigido 1 teste de env pré-existente)

## Fase 9 — CSS, DnD e tipagem (zero-dependência)
- [x] **Pipeline CSS próprio**: `src/core/css.ts` com `scopeCss` (scoped CSS por componente via `[data-fly-scope="<hash>"]`), `generateUtilities` (utilitárias Tailwind-like: flex/grid/gap/padding/margin/text/w/h) e variantes responsivas `sm:`/`md:`/`lg:`/`xl:` via media queries
- [x] **Styled components**: `<style>` por componente é capturado pelo `compile()` (exposto em `Compiled.style`) e escopado; SSR e client aplicam `data-fly-scope` aos elementos (`codegen.ts`); `/__fly/styles.css` servido pelo pipeline e `<link>` injetado no head; `buildProd` escreve `_fly/styles.css`
- [x] **Drag & drop**: `on:dragstart`/`on:drop`/`on:dragover` (diretiva nativa já suportada pelo codegen) + helpers reativos no client: `draggable(el,data)`, `dropTarget(el,onDrop)`, `bindDragReorder(container,opt)` e `moveItem(lista,from,to)` (imutável)
- [x] **Tipagem end-to-end**: `src/core/types.ts` gera `.d.ts` importável (`fly.d.ts`) com `FlyPageParams`, `FlyApiRoutes`, `FlyActionFiles`, aliases `FlyPageLoader`/`FlyServerAction` e `declare module "fly"`; tipos utilitários em `src/types.d.ts` (`Loader`, `ServerAction`, `FlyMeta`, `FlyContext`, `LinkProps`, `ImageProps`, `FormProps`); build escreve `_fly/fly.d.ts`
- [x] 10 testes novos (CSS/scoping, utilities, styles.css build, DnD/diretivas+moveItem, tipos/rotas) → 67 testes no total (todos verdes)
- [x] **Cobertura Lote B completa** (`tests/loteb.test.ts`, +20 testes → 87 no total): security (Session assinado/tamper, createSessionStore, rateLimit janela+limite, rateLimitClient por IP, csrf/verifyCsrf), catch-all `[...rest]` multi-segmento, layouts aninhados (cadeia raiz→profundo), slots (default+nomeado), transição `transition:fade` (codegen + não vaza ao SSR), streaming com loading boundary (shell + swap de `<template>`, placeholders `__FLY_HEAD__`/`__FLY_SCRIPTS__` resolvidos), CLI `init`/`create`
- [x] **Correções de bugs descobertas pela nova suíte**: (1) scanner mapeava `layout/loading/error` para `/layout`/`/loading`/`/error` em vez do diretório (`/`, `/blog`) — quebrava layouts aninhados, streaming e boundaries; (2) catch-all mantinha `*` no nome do param (`params['rest*']`) deixando `params.rest` vazio; (3) streaming nunca resolvia `__FLY_HEAD__`/`__FLY_SCRIPTS__`; (4) `transition:*` vazava para o HTML do SSR (agora filtrado como `on:`); (5) SSG envia `x-fly-nostream` para pré-renderar HTML completo com SEO no `<head>`

## Próximos passos (ainda não implementados)
- [ ] Tailwind standalone (pipar o binário externo para gerar utilities completas, opcional)
- [ ] Streaming/Suspense com conteúdo assíncrono por componente (await em nós)
- [ ] HMR avançado / fast-refresh preservando estado
- [ ] Adoção de DOM real na hidratação (islands adotando nos em vez de substituir `<template>`)
- [ ] i18n / internacionalização
- [ ] Schema/ORM embutido

