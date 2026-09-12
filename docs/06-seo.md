# SEO de Primeira Classe

## 1. Metadata declarativa

```fly
<script>
  export function meta({ data, params }) {
    return {
      title: data.post.title,
      description: data.post.excerpt,
      canonical: `https://site.com/blog/${params.slug}`,
      openGraph: {
        title: data.post.title,
        image: data.post.cover,
        type: "article"
      },
      twitter: { card: "summary_large_image" }
    }
  }
</script>
```

O Fly injeta `<title>`, `<meta>`, OG e Twitter automaticamente no `<head>`.

## 2. Geração automática

- `sitemap.xml` gerado a partir de rotas estáticas + `loader` de listas.
- `robots.txt` configurável em `fly.config.ts`.
- JSON-LD para rich results (Product, Article, Breadcrumb).

## 3. Performance de SEO

- HTML estático real (SSR/SSG) → crawlers veem conteúdo completo.
- Streaming não prejudica indexação (Google executa JS quando necessário, mas Fly já manda HTML).
- `prerender` garante páginas prontas em build.

## 4. i18n & hreflang

```ts
// fly.config.ts
export default {
  i18n: { locales: ["pt","en"], default: "pt" }
}
```

Gera `hreflang` automático e rotas `/pt/...`, `/en/...`.

Próximo: `07-caching.md`.
