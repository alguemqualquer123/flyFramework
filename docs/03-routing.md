# Roteamento (File-based)

## 1. Estrutura

```
app/
  index.fly               → /
  about.fly               → /about
  blog/
    index.fly             → /blog
    [slug].fly             → /blog/:slug
    [slug]/edit.fly        → /blog/:slug/edit
  (auth)/
    login.fly              → /login   (grupo, sem prefixo na URL)
  api/
    users.fly              → POST/GET /api/users
    users/[id].fly         → /api/users/:id
```

## 2. Tipos de rota

- **Página** (`.fly`): renderiza UI + pode ter `loader`/`meta`.
- **Layout** (`layout.fly`): envolve rotas filhas (aninháveis).
- **Loading** (`loading.fly`): fallback de streaming.
- **Error** (`error.fly`): boundary de erro por segmento.
- **API** (`api/**`): handlers `GET/POST/...`.

## 3. Hooks de rota

```fly
<script>
  // loader roda no server (SSR/SSG)
  export async function loader({ params, request, cache }) {
    const data = await cache.fetch(`user:${params.id}`,
      () => db.user.find(params.id), { ttl: 60 })
    return { user: data }
  }

  export function meta({ data }) {
    return { title: data.user.name, og: true }
  }
</script>

<h1>{data.user.name}</h1>
```

## 4. Navegação

- `<Link href="/blog">` → prefetch no hover, transição sem reload.
- Suporte a `router.navigate()`, `router.back()`.
- Scroll restoration automático.

## 5. Casos avançados

- **Rotas paralelas**: `(shop)` e `(marketing)` na mesma URL.
- **Route groups**: `(auth)` organiza sem afetar URL.
- **Wildcard**: `[...catchAll].fly`.

Próximo: `04-rendering.md`.
