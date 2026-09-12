# Fly — Framework Full-Stack Compilado

> "Next.js, porém mais leve, com reatividade compilada estilo Svelte/Vue e zero runtime pesado."

## 1. Visão

**Fly** é um framework full-stack para JS/TS que entrega:

- **Reatividade compilada** (sem Virtual DOM em runtime, como Svelte) via arquivos `.fly`.
- **SSR, SSG, ISR e Streaming** nativos.
- **Backend embutido** (API routes, server actions, middleware, edge).
- **SEO de primeira classe** (metadata, sitemaps, OG automáticos).
- **Cache multicamada** (data, full-route, edge, revalidate).
- **Bundle mínimo** no client (só o necessário para hidratar).

## 2. Por que não só usar Next.js / SvelteKit?

| Capability | Next.js | SvelteKit | **Fly** |
|---|---|---|---|
| Virtual DOM | Sim (pesado) | Não | **Não** |
| Sintaxe própria compilada | Não (JSX) | Sim (.svelte) | **Sim (.fly)** |
| SSR + SSG + ISR | Sim | Parcial | **Sim + granular** |
| Backend integrado | Sim | Sim | **Sim (unificado)** |
| SEO automático | Parcial | Parcial | **Centralizado** |
| Tamanho do runtime client | Médio/Grande | Pequeno | **Mínimo** |
| Cache declarativo | `revalidate` | Manual | **5 camadas declarativas** |

## 3. Princípios de design

1. **Compile-time first**: quanto mais resolvido em build, menos JS no browser.
2. **Convenção sobre configuração**: estrutura de pastas define roteamento, API e cache.
3. **Edge-ready**: código roda em Node ou Edge sem mudar a fonte.
4. **Type-safe end-to-end**: do componente à resposta da API.
5. **Progressivo**: funciona sem JS; hidrata só onde necessário.

## 4. Exemplo mínimo (`pages/index.fly`)

```fly
<script>
  let count = $state(0)
</script>

<h1>Olá Fly</h1>
<button on:click={() => count++}>Cliques: {count}</button>
```

Compila para JS vanilla + pequeno runtime de hidratação (menos de 4kb).

## 5. Escopo deste repositório

- `docs/` — este planejamento (o "qué" e "porquê").
- Em seguida: implementação real em `src/` (o "como").

Próximo: `01-architecture.md`.
