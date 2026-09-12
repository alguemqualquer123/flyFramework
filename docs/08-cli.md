# CLI — `fly`

## 1. Comandos

| Comando | Descrição |
|---|---|
| `fly dev` | servidor de desenvolvimento (HMR, compilação on-the-fly) |
| `fly build` | compila client+server, pré-render, gera sitemap |
| `fly start` | roda o build em produção (Node/Edge) |
| `fly gen component Nome` | cria `components/Nome.fly` |
| `fly gen route blog` | cria rota + loader + meta |
| `fly check` | typecheck + lint do projeto |
| `fly deploy` | envia p/ adapter (Vercel/Netlify/Node) |

## 2. `fly dev` (DX)

- **HMR instantâneo**: recompila só o `.fly` alterado.
- **Error overlay** no browser com stack + sourcemap.
- **Fast refresh** de estado sem perder dados.

## 3. `fly.config.ts`

```ts
import { defineConfig } from "@fly/core"

export default defineConfig({
  adapter: "node",          // | "edge" | "serverless"
  reactividad: "compile",   // sempre compilado
  cache: { default: "memory" },
  seo: { siteUrl: "https://ex.com" },
  build: { minify: true, sourcemap: true }
})
```

## 4. Scripts típicos (`package.json`)

```json
{
  "scripts": {
    "dev": "fly dev",
    "build": "fly build",
    "start": "fly start",
    "check": "fly check"
  }
}
```

Próximo: `09-project-structure.md`.
