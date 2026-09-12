# Performance — Benchmarks Reais

Rodado em Node v24 (x64). Veja `bench/index.ts`.

## Resultados (resumo)

| Eixo | Fly | Referência |
|---|---|---|
| Client runtime (gzip) | **1,15 KB** | React+ReactDOM ~45 KB (**97% menor**) |
| Compilação | 15k–130k comp/s | — |
| SSR throughput | **34k–350k render/s** | Next.js ~1–5k req/s (SSR) |
| Cache (DB 5ms) | **~100x speedup** em hits | — |
| Memória | heap estável (~11 MB total) | — |
| Virtual DOM | **ausente** (updates diretos) | React reconciler |

## Por que é mais leve que React/Next

1. **Reatividade compilada**: o compiler emite updates diretos de DOM (sem diffing de VDOM em runtime).
2. **Runtime de hidratação mínimo**: ~1 KB gzip vs ~45 KB do React.
3. **SSR sem cliente pesado**: HTML útil imediato; só os nós interativos hidratam (islands implícitos).
4. **Sem runtime de bundler no browser**: cache e render vivem no server.

## Como reproduzir

```bash
node --expose-gc bench/index.ts
```
