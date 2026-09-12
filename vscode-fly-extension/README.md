# FlyFramework Support

Complete VS Code extension for [FlyFramework](https://fly.dev) — a full-stack compiled framework with SSR/SSG/ISR and Svelte-like reactivity.

## Features

### Syntax Highlighting
- Full TextMate grammar for `.fly` files
- Highlighting for `<script>`, `<style>`, and template sections
- Color coding for directives (`if`, `for`, `else`), state (`$state`), API handlers, and more

### Theme — Fly Dark
- Custom dark theme optimized for FlyFramework development
- Distinct colors for state variables, API handlers, directives, slots, and config exports
- GitHub-inspired base with Fly-specific accent colors

### File Icons
- Custom icon for `.fly` files (golden lightning bolt)
- Custom icon for `fly.config.ts` (gear + lightning)
- Custom folder icons for `src/core`, `src/router`, `src/cache`, `src/compiler`, `src/seo`, `src/cli`, `src/runtime`
- All icons respect the FlyFramework color scheme

### IntelliSense & Auto-Complete
- **Script completions**: `$state()`, `loader`, `meta`, `GET/POST/PUT/PATCH/DELETE`, `middleware`, `generateStaticParams`, directives, config exports
- **Template completions**: HTML tags, `if`, `for`, `else`, `<slot />`, reactive variables
- **Config completions**: `defineConfig`, `appDir`, `siteUrl`, `adapter`, `build` options
- Auto-detects `$state()` variables and suggests them in template
- Auto-detects exported functions and suggests them

### Hover Documentation
- Detailed documentation for every FlyFramework API:
  - `$state()` — reactive state
  - `loader()` — server data loading
  - `meta()` — SEO metadata
  - `GET/POST/PUT/PATCH/DELETE` — API handlers
  - `middleware()` — request middleware
  - `generateStaticParams()` — SSG
  - `render`, `revalidate`, `prerender` — config exports
  - `"use server"`, `"use client"` — directives
  - `cache.fetch()` — cached data
  - `flyUtils.redirect()`, `flyUtils.notFound()`, `flyUtils.revalidateTag()`
  - `<slot />`, `if`, `for`, `else` — template directives

### Diagnostics (Linting)
- **fly-invalid-directive**: Cannot use both `"use server"` and `"use client"` in the same file
- **fly-missing-loader**: Page may be missing a `loader` function
- **fly-action-missing-use-server**: Action function missing `"use server"` directive
- **fly-for-missing-of**: For loop expression missing `of` keyword
- **fly-slot-outside-layout**: `<slot />` used outside a layout file
- **fly-api-no-handler**: API route has no HTTP method handler
- **fly-duplicate-export**: Duplicate export definitions
- **fly-nested-script**: Mismatched `<script>` tags
- **fly-empty-template**: Template has no HTML content

### Go to Definition
- Navigate to `loader`, `meta`, `middleware`, `generateStaticParams` definitions
- Navigate to API handler definitions (`GET`, `POST`, etc.)
- Navigate to `flyUtils`, `cache`, and `$state` declarations

### Document Symbols (Outline)
- See all exports in the Outline panel:
  - State variables (Reactive State)
  - `loader` (Server Data Loader)
  - `meta` (SEO Metadata)
  - API handlers (API Handler (GET), etc.)
  - Server actions (Server Action)
  - Config exports (Rendering Mode, ISR, SSG)
  - Template elements (HTML Element, Content Slot)

### CodeLens
- Inline code lenses for quick identification:
  - `$(database) Loader` — server data loader
  - `$(gear) SEO Meta` — SEO metadata
  - `$(globe) GET/POST/PUT/PATCH/DELETE` — API handlers
  - `$(zap) Server Action` — server actions
  - `$(shield) Middleware` — request middleware
  - `$(list-ordered) SSG Params` — static route generation
  - `$(play) Render Mode` — rendering strategy
  - `$(sync) ISR` — incremental static regeneration
  - `$(package) SSG` — static site generation

### Snippets
#### Template Snippets
- `fly:page` — Basic page with loader + meta
- `fly:page-dynamic` — Dynamic route with generateStaticParams
- `fly:page-isr` — ISR page with revalidation
- `fly:page-ssg` — Prerendered (SSG) page
- `fly:page-stream` — Streaming page
- `fly:api` — API route with GET + POST
- `fly:api-crud` — Full CRUD API route
- `fly:action` — Server action
- `fly:action-validate` — Server action with validation
- `fly:middleware` — Basic middleware
- `fly:middleware-auth` — Auth middleware
- `fly:layout` — Layout with header/main/footer
- `fly:loading` — Loading state with spinner
- `fly:error` — Error page
- `fly:state` — Reactive state declaration
- `fly:state-object` — Reactive state object
- `fly:state-array` — Reactive state array
- `fly:for` — For loop
- `fly:for-index` — For loop with index
- `fly:if` — Conditional rendering
- `fly:if-else` — If/else conditional
- `fly:slot` — Slot insertion
- `fly:slot-named` — Named slot
- `fly:config` — fly.config.ts
- `fly:cache` — Cached data fetch
- `fly:redirect` — Server redirect
- `fly:notfound` — 404 response
- `fly:revalidate-tag` — Tag invalidation
- `fly:revalidate-path` — Path invalidation

#### Config Snippets
- `fly:config` — Full configuration
- `fly:config-minimal` — Minimal configuration

### Commands
- **Fly: New Page** — Create a new `.fly` page file
- **Fly: New API Route** — Create a new API route
- **Fly: New Server Action** — Create a new server action
- **Fly: New Config** — Create a `fly.config.ts` file
- **Fly: New Middleware** — Create a middleware
- **Fly: New Layout** — Create a layout
- **Fly: New Loading** — Create a loading state
- **Fly: New Error** — Create an error page
- **Fly: Refresh** — Refresh extension

## File Structure

```
your-project/
  fly.config.ts          # FlyFramework configuration
  app/
    layout.fly           # Root layout
    loading.fly          # Loading state
    error.fly            # Error page
    middleware.fly        # Middleware
    index.fly            # Home page
    about.fly            # About page
    api/
      users.fly          # API route
    dashboard/
      layout.fly         # Nested layout
      page.fly           # Dashboard page
      settings.fly       # Settings page
```

## Installation

### From VSIX
1. Package the extension: `vsce package`
2. Install in VS Code: `code --install-extension fly-framework-1.0.0.vsix`

### From Source
1. Clone the extension directory
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch the Extension Development Host

## Configuration

The extension activates automatically when:
- A `.fly` file is opened
- A workspace contains `.fly` files

## License

MIT
