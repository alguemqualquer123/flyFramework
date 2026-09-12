# Arquitetura do Fly

## 1. Camadas

```
┌─────────────────────────────────────────────┐
│                 CLI (fly)                    │  dev / build / start / gen
├─────────────────────────────────────────────┤
│              Compiler Core                   │  parser .fly -> AST -> JS/TS
│   (lexer, parser, optimizer, codegen)        │
├──────────────────────┬──────────────────────┤
│     Runtime (client) │     Runtime (server)  │
│  hydratação mínima   │  SSR / streaming      │
├──────────────────────┴──────────────────────┤
│              Request Pipeline                │
│  router -> middleware -> loader -> render    │
├─────────────────────────────────────────────┤
│              Cache Layer (5 níveis)          │
├─────────────────────────────────────────────┤
│   Adapters: Node | Edge | Serverless | Deno  │
└─────────────────────────────────────────────┘
```

## 2. Fluxos principais

### Build
1. Scanner descobre `pages/`, `api/`, `components/`.
2. Compiler compila `.fly` -> AST -> módulos otimizados.
3. Bundler (rolup/esbuild) gera client + server bundles.
4. Pré-render de rotas estáticas (SSG/ISR).

### Request (SSR)
```
Request → Adapter → Router → Middleware
        → Loader (data + cache) → Render (stream)
        → Cache write → Response
```

## 3. Módulos do monorepo

| Pacote | Responsabilidade |
|---|---|
| `@fly/compiler` | Parser/codegen de `.fly` |
| `@fly/runtime` | Hidratação client + helpers server |
| `@fly/router` | File-based routing + matching |
| `@fly/cache` | Camadas de cache + revalidate |
| `@fly/cli` | Interface de linha de comando |
| `@fly/core` | Pipeline de request/response |
| `@fly/seo` | Metadata, sitemap, OG |

## 4. Decisões técnicas

- **Parser**: hand-written tokenizer + Pratt parser (previsível, rápido).
- **Codegen**: emite ES Modules; mantém sourcemaps.
- **Runtime client**: reatividade por "signals" compilados, sem diffing.
- **Server**: streaming via Web Streams (compatível com edge).
- **Adapters**: mesma API `handle(request)` para todos os targets.

Próximo: `02-reactivity-compiler.md`.
