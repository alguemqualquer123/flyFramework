# Renderização: SSR / SSG / ISR / Streaming

## 1. Modos (definidos por rota)

```fly
<script>
  export const render = "ssg"        // ou "ssr" | "isr" | "spa"
  export const revalidate = 60        // p/ isr (segundos)
  export const prerender = true       // força SSG no build
</script>
```

| Modo | Quando | Cache |
|---|---|---|
| `ssr` | dados ao vivo | por request (ou cache) |
| `ssg` | conteúdo estático | em build |
| `isr` | quase estático | build + revalidate |
| `spa` | app interno | client-only |

## 2. Streaming & Suspense

- `await` em `loader` vira stream: shell HTML envia primeiro, conteúdo chega depois.
- `loading.fly` exibido enquanto o chunk chega.
- Usa Web Streams → funciona em edge.

```fly
<script>
  export async function loader() {
    const posts = await fetchPosts()   // streama este pedaço
    return { posts }
  }
</script>

{#await posts}
  <loading.fly />
{:then list}
  <for={p of list}><Post {p} /></for>
{/await}
```

## 3. Server Components (Fly Server Modules)

Arquivos `.fly.server` rodam **só no server** (nunca vão pro client):

```fly
<!-- Card.server.fly -->
<script>
  export async function render({ id }) {
    const d = await db.get(id)   // seguro: credenciais nunca expostas
    return `<div>{d.title}</div>`
  }
</script>
```

## 4. Hidratação seletiva (Islands)

Marque componentes interativos: `<Counter client:visible />`.
O resto do HTML permanece estático → bundle client mínimo.

## 5. Resumo de performance

- TTFB baixo (streaming).
- FCP rápido (HTML útil imediato).
- TBT baixo (pouco JS de hidratação).

Próximo: `05-backend.md`.
