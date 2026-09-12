# Cache Multicamada

## 1. As 5 camadas

```
1. Data Cache      — fetch/db com TTL + revalidate
2. Route Cache     — resposta HTTP completa (SSR/ISR)
3. Fragment Cache  — pedaços de componente (server)
4. CDN/Edge Cache  — cache de borda por região
5. Client Cache    — prefetch de rotas no browser
```

## 2. Data Cache (loader)

```fly
<script>
  export async function loader({ cache }) {
    return cache.fetch("stats", () => db.stats(), {
      ttl: 300,            // segundos
      tags: ["stats"]      // p/ invalidação granular
    })
  }
</script>
```

Invalidação sob demanda:

```ts
import { revalidateTag } from "@fly/cache"
await revalidateTag("stats")   // em server action
```

## 3. Route Cache (ISA)

```fly
<script>
  export const render = "isr"
  export const revalidate = 60
</script>
```

A resposta é servida do cache; após 60s, reconstrói em background (stale-while-revalidate).

## 4. Fragment Cache

```fly
<Cache tags={["nav"]}>
  <Nav />
</Cache>
```

## 5. Estratégia recomendada

| Conteúdo | Cache |
|---|---|
| Página de produto | ISR 300s + tag `product` |
| Dashboard | SSR + data cache 30s |
| Blog | SSG + revalidate on publish |
| API pública | Route cache 60s + CDN |

Próximo: `08-cli.md`.
