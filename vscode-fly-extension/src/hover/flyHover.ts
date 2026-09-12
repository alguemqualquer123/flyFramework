import * as vscode from "vscode";

interface HoverEntry {
  pattern: RegExp;
  content: string;
}

const FLY_API_HOVERS: HoverEntry[] = [
  {
    pattern: /\$state\s*\(/,
    content: [
      "**$state()** — Reactive State",
      "",
      "Declares a reactive state variable. The UI updates automatically when the value changes.",
      "",
      "```typescript",
      "let count = $state(0);           // number",
      "let name = $state('');           // string",
      "let user = $state({ name: '' }); // object (deep reactive)",
      "let items = $state([]);          // array (deep reactive)",
      "let flag = $state(false);        // boolean",
      "```",
      "",
      "**Types:**",
      "- Primitives (string, number, boolean): reactive signal",
      "- Objects/Arrays: deep reactive proxy",
      "- `null` / `undefined`: allowed as initial value",
    ].join("\n"),
  },
  {
    pattern: /export\s+(async\s+)?function\s+loader/,
    content: [
      "**loader()** — Server-Side Data Loader",
      "",
      "Runs on the server before rendering. Returns data passed to the template.",
      "",
      "```typescript",
      "export async function loader({ request, params, cache, url }) {",
      "  return { data: { users: [] } };",
      "}",
      "```",
      "",
      "**Context parameter:**",
      "```typescript",
      "type LoaderCtx = {",
      "  request: Request;           // incoming HTTP request",
      "  params: Record<string, string>; // route params (:id, :slug)",
      "  cache: DataCache;           // caching instance",
      "  url: URL;                   // parsed request URL",
      "  flyUtils: FlyUtils;         // redirect, notFound, revalidate*",
      "}",
      "```",
      "",
      "**Returns:** `{ data: T }` — passed to template as `data` and to `meta()`.",
    ].join("\n"),
  },
  {
    pattern: /export\s+function\s+meta/,
    content: [
      "**meta()** — SEO Metadata",
      "",
      "Defines page metadata for SEO: title, description, OpenGraph, Twitter cards, JSON-LD.",
      "",
      "```typescript",
      "export function meta({ data, params }) {",
      "  return {",
      "    title: 'Page Title',         // <title> tag",
      "    description: 'Description',  // <meta name=\"description\">",
      "    canonical: 'https://...',    // <link rel=\"canonical\">",
      "    openGraph: {                 // <meta property=\"og:*\">",
      "      title: 'OG Title',",
      "      description: 'OG Desc',",
      "      image: '/og.png',",
      "      url: 'https://...',",
      "      type: 'website',",
      "    },",
      "    twitter: {                   // <meta name=\"twitter:*\">",
      "      card: 'summary_large_image',",
      "      title: 'Tweet Title',",
      "      image: '/twitter.png',",
      "    },",
      "    jsonLd: {                    // <script type=\"application/ld+json\">",
      "      '@type': 'WebPage',",
      "      name: 'Page Name',",
      "    }",
      "  };",
      "}",
      "```",
      "",
      "**Parameters:** `{ data, params }`",
      "- `data`: Return value from `loader()`",
      "- `params`: Route parameters",
    ].join("\n"),
  },
  {
    pattern: /export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/,
    content: [
      "**API Handler** — HTTP Method Handler",
      "",
      "Handles HTTP requests for API routes (files in `/api/` directory).",
      "",
      "```typescript",
      "export async function GET({ request, params, url }) {",
      "  return Response.json({ users: [] });",
      "}",
      "",
      "export async function POST({ request, params, url }) {",
      "  const body = await request.json();",
      "  return Response.json({ created: true, ...body }, { status: 201 });",
      "}",
      "",
      "export async function PUT({ request, params, url }) {",
      "  const body = await request.json();",
      "  return Response.json({ updated: true });",
      "}",
      "",
      "export async function PATCH({ request, params, url }) {",
      "  const body = await request.json();",
      "  return Response.json({ patched: true });",
      "}",
      "",
      "export async function DELETE({ request, params, url }) {",
      "  return Response.json({ deleted: true });",
      "}",
      "```",
      "",
      "**Context parameter:**",
      "```typescript",
      "type ApiCtx = {",
      "  request: Request;",
      "  params: Record<string, string>;",
      "  url: URL;",
      "}",
      "```",
      "",
      "**Returns:** `Response | object | string`",
      "- `Response`: raw Response object",
      "- `object`: auto-wrapped with `Response.json()`",
      "- `string`: returned as `text/html`",
    ].join("\n"),
  },
  {
    pattern: /export\s+default\s+(async\s+)?function\s+middleware/,
    content: [
      "**middleware()** — Request Middleware",
      "",
      "Runs before route handling. Can redirect, return early, or call `next()`.",
      "",
      "```typescript",
      "export default async function middleware({ request, next }) {",
      "  const url = new URL(request.url);",
      "",
      "  // Guard routes",
      "  if (url.pathname.startsWith('/admin')) {",
      "    const session = request.headers.get('cookie');",
      "    if (!session) return Response.redirect('/login', 302);",
      "  }",
      "",
      "  // Continue to route",
      "  return next();",
      "}",
      "```",
      "",
      "**Parameters:**",
      "- `request: Request` — incoming HTTP request",
      "- `next: () => Response | null` — continue to route handler",
      "",
      "**Returns:** `Response | null`",
      "- `Response`: short-circuit (redirect, error page)",
      "- `next()`: continue to the matched route",
    ].join("\n"),
  },
  {
    pattern: /export\s+(async\s+)?function\s+generateStaticParams/,
    content: [
      "**generateStaticParams()** — Static Route Generation",
      "",
      "Returns an array of param objects for SSG. Each object = a pre-rendered route.",
      "",
      "```typescript",
      "export async function generateStaticParams() {",
      "  return [",
      "    { id: '1' },",
      "    { id: '2' },",
      "    { id: '3' }",
      "  ];",
      "}",
      "```",
      "",
      "**Use with:** `export const prerender = true;`",
    ].join("\n"),
  },
  {
    pattern: /export\s+const\s+render\s*=/,
    content: [
      "**render** — Rendering Mode",
      "",
      "```typescript",
      'export const render = "client";   // CSR - client-side hydration',
      'export const render = "stream";   // SSR streaming with <loading>',
      'export const render = "pipe";     // pipe-based progressive',
      "```",
      "",
      "| Mode | Description |",
      "|---|---|",
      "| `client` | Minimal HTML, JS hydrates in browser |",
      "| `stream` | Streaming SSR, shows loading.fly while data loads |",
      "| `pipe` | Progressive rendering via pipe |",
    ].join("\n"),
  },
  {
    pattern: /export\s+const\s+revalidate\s*=/,
    content: [
      "**revalidate** — ISR (Incremental Static Regeneration)",
      "",
      "```typescript",
      "export const revalidate = 60; // re-generate every 60 seconds",
      "```",
      "",
      "**Behavior:**",
      "1. First request → serves cached HTML",
      "2. After `N` seconds → next request triggers background re-generation",
      "3. New visitors get the updated page",
    ].join("\n"),
  },
  {
    pattern: /export\s+const\s+prerender\s*=\s*true/,
    content: [
      "**prerender** — Static Site Generation (SSG)",
      "",
      "```typescript",
      "export const prerender = true;",
      "```",
      "",
      "Page is pre-rendered at build time. Use with `generateStaticParams()` for dynamic routes.",
    ].join("\n"),
  },
  {
    pattern: /"use\s+server"/,
    content: [
      '**"use server"** — Server Actions Directive',
      "",
      "All exported functions become server actions callable from the client.",
      "",
      "```typescript",
      '"use server";',
      "",
      "export async function submitForm(data) {",
      "  await db.insert('users', data);",
      "  return { success: true };",
      "}",
      "",
      "export async function deleteUser(id) {",
      "  await db.delete('users', id);",
      "  return { deleted: true };",
      "}",
      "```",
      "",
      "**Behavior:**",
      "- Auto-serialized RPC calls",
      "- Access `request`, `cache`, `flyUtils` implicitly",
      "- Called from client via `import { submitForm } from './actions.fly'`",
    ].join("\n"),
  },
  {
    pattern: /"use\s+client"/,
    content: [
      '**"use client"** — Client Directive',
      "",
      "Component only runs in the browser.",
      "",
      "```typescript",
      '"use client";',
      "",
      "let count = $state(0);",
      "let name = $state('');",
      "",
      "function increment() { count++; }",
      "```",
      "",
      "**Available:** `$state()`, DOM APIs, browser events",
      "**Not available:** `loader`, `meta`, server functions",
    ].join("\n"),
  },
  {
    pattern: /cache\.fetch\s*\(/,
    content: [
      "**cache.fetch()** — Cached Data Fetch",
      "",
      "```typescript",
      "const users = await cache.fetch('users', async () => {",
      "  return await db.query('SELECT * FROM users');",
      "}, {",
      "  ttl: 60,           // seconds (0 = no expiry)",
      "  tags: ['users']    // for batch invalidation",
      "});",
      "```",
      "",
      "**Options:** `{ ttl?: number; tags?: string[] }`",
    ].join("\n"),
  },
  {
    pattern: /flyUtils\.redirect\s*\(/,
    content: [
      "**flyUtils.redirect()** — Server Redirect",
      "",
      "```typescript",
      "flyUtils.redirect('/login');            // 302 (default)",
      "flyUtils.redirect('/new', 301);         // permanent",
      "flyUtils.redirect('/temp', 307);        // temporary",
      "```",
      "",
      "**Parameters:** `(path: string, status?: 301 | 302 | 307 | 308)`",
    ].join("\n"),
  },
  {
    pattern: /flyUtils\.notFound\s*\(/,
    content: [
      "**flyUtils.notFound()** — 404 Response",
      "",
      "```typescript",
      "flyUtils.notFound();",
      "```",
      "",
      "Renders `error.fly` with 404 status if it exists, otherwise returns plain \"Not Found\".",
    ].join("\n"),
  },
  {
    pattern: /flyUtils\.revalidateTag\s*\(/,
    content: [
      "**flyUtils.revalidateTag()** — Invalidate Cache by Tag",
      "",
      "```typescript",
      "flyUtils.revalidateTag('users');",
      "```",
      "",
      "Invalidates all `cache.fetch()` entries tagged with `'users'`.",
    ].join("\n"),
  },
  {
    pattern: /flyUtils\.revalidatePath\s*\(/,
    content: [
      "**flyUtils.revalidatePath()** — Invalidate Cache by Path",
      "",
      "```typescript",
      "flyUtils.revalidatePath('/dashboard');",
      "```",
      "",
      "Clears the route cache for the given path.",
    ].join("\n"),
  },
];

const HTML_ELEMENT_HOVERS: HoverEntry[] = [
  {
    pattern: /<\s*div\b/i,
    content: [
      "**`<div>`** — Generic Container",
      "",
      "Block-level container with no semantic meaning.",
      "",
      "**Fly directives:** `if`, `for`, `else`",
      "**Events:** `onclick`, `oninput`, `onchange`, `onsubmit`, `onkeydown`, `onkeyup`, `onfocus`, `onblur`, `onmouseenter`, `onmouseleave`, `onload`",
    ].join("\n"),
  },
  {
    pattern: /<\s*span\b/i,
    content: [
      "**`<span>`** — Inline Container",
      "",
      "Inline-level container for grouping inline elements.",
    ].join("\n"),
  },
  {
    pattern: /<\s*button\b/i,
    content: [
      "**`<button>`** — Interactive Button",
      "",
      "Clickable element for user actions.",
      "",
      "```html",
      "<button onclick=\"{handleClick}\">Click me</button>",
      "<button on:click=\"{handleClick}\">Click me</button>",
      "<button disabled=\"{isDisabled}\">Submit</button>",
      "```",
      "",
      "**Attributes:** `disabled`, `type` (submit/button/reset), `form`, `name`, `value`",
      "**Events:** `onclick`, `on:click`, `onmousedown`, `onmouseup`, `onfocus`, `onblur`",
    ].join("\n"),
  },
  {
    pattern: /<\s*input\b/i,
    content: [
      "**`<input>`** — Input Field",
      "",
      "```html",
      "<input type=\"text\" value=\"{name}\" oninput=\"{handleInput}\" />",
      "<input type=\"email\" value=\"{email}\" on:input=\"{handleEmail}\" />",
      "<input type=\"password\" value=\"{pass}\" />",
      "<input type=\"number\" value=\"{age}\" min=\"0\" max=\"120\" />",
      "<input type=\"checkbox\" checked=\"{isActive}\" />",
      "<input type=\"radio\" name=\"option\" value=\"a\" />",
      "<input type=\"file\" onchange=\"{handleFile}\" />",
      "<input type=\"submit\" value=\"Send\" />",
      "<input type=\"search\" placeholder=\"Search...\" />",
      "<input type=\"date\" value=\"{date}\" />",
      "<input type=\"color\" value=\"{color}\" />",
      "<input type=\"range\" min=\"0\" max=\"100\" value=\"{slider}\" />",
      "<input type=\"hidden\" value=\"{token}\" />",
      "```",
      "",
      "**Types:** text, password, email, number, checkbox, radio, file, submit, search, date, time, datetime-local, color, range, url, tel, hidden",
      "",
      "**Attributes:** `type`, `value`, `placeholder`, `disabled`, `readonly`, `required`, `min`, `max`, `step`, `minlength`, `maxlength`, `pattern`, `name`, `id`, `autocomplete`, `autofocus`, `multiple`",
      "",
      "**Events:** `oninput`, `on:input`, `onchange`, `on:change`, `onfocus`, `onblur`, `onkeydown`, `onkeyup`, `onsubmit`",
    ].join("\n"),
  },
  {
    pattern: /<\s*textarea\b/i,
    content: [
      "**`<textarea>`** — Multi-line Text Input",
      "",
      "```html",
      "<textarea value=\"{text}\" oninput=\"{handleText}\" rows=\"5\"></textarea>",
      "<textarea placeholder=\"Write here...\" disabled=\"{isLoading}\"></textarea>",
      "```",
      "",
      "**Attributes:** `value`, `placeholder`, `rows`, `cols`, `disabled`, `readonly`, `required`, `maxlength`, `name`, `wrap`",
      "**Events:** `oninput`, `on:input`, `onchange`, `on:change`, `onfocus`, `onblur`",
    ].join("\n"),
  },
  {
    pattern: /<\s*a\b/i,
    content: [
      "**`<a>`** — Hyperlink / Client Navigation",
      "",
      "```html",
      "<a href=\"/about\">About</a>",
      "<a href=\"/users/{id}\">User Profile</a>",
      "<a href=\"/login\" onclick=\"{handleNav}\">Login</a>",
      "```",
      "",
      "**Attributes:** `href`, `target` (_blank, _self), `rel` (noopener, noreferrer), `download`",
      "**Events:** `onclick`, `on:click`",
      "",
      "FlyFramework uses client-side navigation for internal links.",
    ].join("\n"),
  },
  {
    pattern: /<\s*form\b/i,
    content: [
      "**`<form>`** — Form Container",
      "",
      "```html",
      "<form onsubmit=\"{handleSubmit}\">",
      "  <input type=\"text\" value=\"{name}\" />",
      "  <button type=\"submit\">Send</button>",
      "</form>",
      "",
      "<form on:submit=\"{handleAction}\">",
      "  <slot />",
      "</form>",
      "```",
      "",
      "**Attributes:** `action`, `method` (GET/POST), `enctype`, `novalidate`",
      "**Events:** `onsubmit`, `on:submit`, `onreset`, `on:reset`",
    ].join("\n"),
  },
  {
    pattern: /<\s*img\b/i,
    content: [
      "**`<img>`** — Image",
      "",
      "```html",
      "<img src=\"/photo.jpg\" alt=\"Photo\" />",
      "<img src=\"{imageUrl}\" alt=\"{altText}\" loading=\"lazy\" />",
      "```",
      "",
      "**Attributes:** `src`, `alt`, `width`, `height`, `loading` (lazy/eager), `srcset`, `sizes`, `decoding`, `crossorigin`",
      "**Events:** `onload`, `onerror`",
    ].join("\n"),
  },
  {
    pattern: /<\s*select\b/i,
    content: [
      "**`<select>`** — Dropdown Select",
      "",
      "```html",
      "<select value=\"{selected}\" onchange=\"{handleSelect}\">",
      "  <option value=\"a\">Option A</option>",
      "  <option value=\"b\">Option B</option>",
      "  <option for=\"{opt of options}\" value=\"{opt.id}\">{opt.name}</option>",
      "</select>",
      "```",
      "",
      "**Attributes:** `value`, `disabled`, `multiple`, `name`, `size`, `required`",
      "**Events:** `onchange`, `on:change`, `onfocus`, `onblur`",
    ].join("\n"),
  },
  {
    pattern: /<\s*option\b/i,
    content: [
      "**`<option>`** — Select Option",
      "",
      "```html",
      "<option value=\"opt1\">Option 1</option>",
      "<option value=\"{item.id}\" selected=\"{item.id === selected}\">{item.name}</option>",
      "```",
      "",
      "**Attributes:** `value`, `selected`, `disabled`, `label`",
    ].join("\n"),
  },
  {
    pattern: /<\s*header\b/i,
    content: ["**`<header>`** — Semantic Header section. Typically contains nav, logo, title."].join("\n"),
  },
  {
    pattern: /<\s*footer\b/i,
    content: ["**`<footer>`** — Semantic Footer section. Typically contains links, copyright, contact."].join("\n"),
  },
  {
    pattern: /<\s*main\b/i,
    content: ["**`<main>`** — Main content area. Only one per page. Excludes header/footer/sidebar."].join("\n"),
  },
  {
    pattern: /<\s*nav\b/i,
    content: [
      "**`<nav>`** — Navigation",
      "",
      "```html",
      "<nav>",
      "  <a href=\"/\">Home</a>",
      "  <a href=\"/about\">About</a>",
      "</nav>",
      "```",
    ].join("\n"),
  },
  {
    pattern: /<\s*section\b/i,
    content: ["**`<section>`** — Thematic grouping of content. Use with `<h1>`-`<h6>` headings."].join("\n"),
  },
  {
    pattern: /<\s*article\b/i,
    content: ["**`<article>`** — Self-contained content (blog post, news story, comment)."].join("\n"),
  },
  {
    pattern: /<\s*aside\b/i,
    content: ["**`<aside>`** — Sidebar / tangentially related content."].join("\n"),
  },
  {
    pattern: /<\s*ul\b/i,
    content: ["**`<ul>`** — Unordered list. Use with `<li>` children."].join("\n"),
  },
  {
    pattern: /<\s*ol\b/i,
    content: [
      "**`<ol>`** — Ordered list",
      "",
      "**Attributes:** `start` (starting number), `reversed`, `type` (1, a, A, i, I)",
    ].join("\n"),
  },
  {
    pattern: /<\s*li\b/i,
    content: ["**`<li>`** — List item. Must be inside `<ul>` or `<ol>`."].join("\n"),
  },
  {
    pattern: /<\s*h[1-6]\b/i,
    content: [
      "**`<h1>`-`<h6>`** — Headings",
      "",
      "```html",
      "<h1>Main title (one per page)</h1>",
      "<h2>Section heading</h2>",
      "<h3>Sub-section heading</h3>",
      "```",
      "",
      "Use headings in order. Don't skip levels.",
    ].join("\n"),
  },
  {
    pattern: /<\s*p\b/i,
    content: ["**`<p>`** — Paragraph. Block-level text container."].join("\n"),
  },
  {
    pattern: /<\s*table\b/i,
    content: [
      "**`<table>`** — Data Table",
      "",
      "```html",
      "<table>",
      "  <thead><tr><th>Name</th><th>Age</th></tr></thead>",
      "  <tbody>",
      "    <tr for=\"{user of users}\">",
      "      <td>{user.name}</td>",
      "      <td>{user.age}</td>",
      "    </tr>",
      "  </tbody>",
      "</table>",
      "```",
    ].join("\n"),
  },
  {
    pattern: /<\s*slot\s*\/?>/i,
    content: [
      "**`<slot />`** — Content Insertion Point",
      "",
      "Insertion point for child content in a layout component.",
      "",
      "```html",
      "<!-- layout.fly -->",
      "<div class=\"layout\">",
      "  <header>Nav</header>",
      "  <main>",
      "    <slot />  <!-- child page content goes here -->",
      "  </main>",
      "  <footer>Footer</footer>",
      "</div>",
      "```",
      "",
      "**How it works:**",
      "- In layouts: `<slot />` is replaced by the child page's HTML",
      "- Only works in `layout.fly` files",
      "- Content outside `<slot />` persists across navigations",
    ].join("\n"),
  },
];

const FLY_EVENT_HOVERS: HoverEntry[] = [
  {
    pattern: /\bon:click\b/i,
    content: [
      "**`on:click`** — Click Event (FlyFramework Syntax)",
      "",
      "Fires when the element is clicked.",
      "",
      "```html",
      "<button on:click=\"{handleClick}\">Click me</button>",
      "<div on:click=\"{increment}\">Count: {count}</div>",
      "<a on:click=\"{handleNav}\">Navigate</a>",
      "```",
      "",
      "```typescript",
      "let count = $state(0);",
      "function increment() { count++; }",
      "```",
      "",
      "**Event object:** `MouseEvent`",
      "**Properties:** `clientX`, `clientY`, `screenX`, `screenY`, `button`, `ctrlKey`, `shiftKey`, `altKey`, `metaKey`, `target`, `currentTarget`",
      "**Methods:** `preventDefault()`, `stopPropagation()`, `stopImmediatePropagation()`",
    ].join("\n"),
  },
  {
    pattern: /\bon:input\b/i,
    content: [
      "**`on:input`** — Input Event (FlyFramework Syntax)",
      "",
      "Fires immediately when the value changes (every keystroke).",
      "",
      "```html",
      "<input type=\"text\" on:input=\"{handleInput}\" />",
      "<textarea on:input=\"{handleText}\"></textarea>",
      "```",
      "",
      "```typescript",
      "let text = $state('');",
      "function handleInput(e) {",
      "  text = e.target.value;",
      "}",
      "```",
      "",
      "**Event object:** `InputEvent`",
      "**Properties:** `data`, `inputType`, `isComposing`, `target.value`",
    ].join("\n"),
  },
  {
    pattern: /\bon:change\b/i,
    content: [
      "**`on:change`** — Change Event (FlyFramework Syntax)",
      "",
      "Fires when the element loses focus after value changed (input, select, textarea).",
      "",
      "```html",
      "<select on:change=\"{handleSelect}\">...</select>",
      "<input type=\"checkbox\" on:change=\"{toggle}\" />",
      "<input type=\"file\" on:change=\"{handleFile}\" />",
      "```",
      "",
      "**Event object:** `Event` (inputs) / `InputEvent` (textarea)",
      "**Properties:** `target.value`, `target.checked`, `target.files`",
    ].join("\n"),
  },
  {
    pattern: /\bon:submit\b/i,
    content: [
      "**`on:submit`** — Submit Event (FlyFramework Syntax)",
      "",
      "Fires when a form is submitted.",
      "",
      "```html",
      "<form on:submit=\"{handleSubmit}\">",
      "  <input type=\"text\" value=\"{name}\" />",
      "  <button type=\"submit\">Send</button>",
      "</form>",
      "```",
      "",
      "```typescript",
      "let name = $state('');",
      "async function handleSubmit(e) {",
      "  e.preventDefault();",
      "  await submitAction(name);",
      "}",
      "```",
      "",
      "**Event object:** `SubmitEvent`",
      "**Properties:** `submitter`, `target`, `target.elements`",
    ].join("\n"),
  },
  {
    pattern: /\bon:key(down|up|press)\b/i,
    content: [
      "**`on:keydown` / `on:keyup` / `on:keypress`** — Keyboard Events",
      "",
      "```html",
      "<input on:keydown=\"{handleKey}\" />",
      "<input on:keyup=\"{handleKeyUp}\" />",
      "<div on:keydown=\"{handleEscape}\">...</div>",
      "```",
      "",
      "```typescript",
      "function handleKey(e) {",
      "  if (e.key === 'Enter') submit();",
      "  if (e.key === 'Escape') cancel();",
      "  if (e.ctrlKey && e.key === 's') save();",
      "}",
      "```",
      "",
      "**Event object:** `KeyboardEvent`",
      "**Properties:** `key`, `code`, `location`, `repeat`, `ctrlKey`, `shiftKey`, `altKey`, `metaKey`",
      "**Common keys:** `Enter`, `Escape`, `Tab`, `Backspace`, `Delete`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Space`",
    ].join("\n"),
  },
  {
    pattern: /\bon:focus\b/i,
    content: [
      "**`on:focus`** — Focus Event",
      "",
      "Fires when the element receives focus.",
      "",
      "```html",
      "<input on:focus=\"{handleFocus}\" on:blur=\"{handleBlur}\" />",
      "```",
      "",
      "**Event object:** `FocusEvent`",
      "**Properties:** `relatedTarget`, `target`",
    ].join("\n"),
  },
  {
    pattern: /\bon:blur\b/i,
    content: [
      "**`on:blur`** — Blur Event",
      "",
      "Fires when the element loses focus.",
      "",
      "```html",
      "<input on:blur=\"{validateField}\" />",
      "```",
      "",
      "**Event object:** `FocusEvent`",
      "**Properties:** `relatedTarget`, `target`",
    ].join("\n"),
  },
  {
    pattern: /\bon:mouse(enter|leave|move|over|out)\b/i,
    content: [
      "**`on:mouseenter` / `on:mouseleave` / `on:mousemove`** — Mouse Events",
      "",
      "```html",
      "<div on:mouseenter=\"{showTooltip}\" on:mouseleave=\"{hideTooltip}\">",
      "  Hover me",
      "</div>",
      "<div on:mousemove=\"{trackMouse}\">...</div>",
      "```",
      "",
      "**Event object:** `MouseEvent`",
      "**Properties:** `clientX`, `clientY`, `screenX`, `screenY`, `button`, `buttons`, `relatedTarget`",
    ].join("\n"),
  },
  {
    pattern: /\bon:doubleclick\b/i,
    content: [
      "**`on:dblclick`** — Double Click Event",
      "",
      "```html",
      "<div on:dblclick=\"{handleDoubleClick}\">Double-click me</div>",
      "```",
      "",
      "**Event object:** `MouseEvent`",
    ].join("\n"),
  },
  {
    pattern: /\bon:contextmenu\b/i,
    content: [
      "**`on:contextmenu`** — Right-Click Menu Event",
      "",
      "```html",
      "<div on:contextmenu=\"{showContextMenu}\">Right-click me</div>",
      "```",
      "",
      "**Event object:** `MouseEvent`",
      "**Tip:** Call `e.preventDefault()` to suppress default context menu.",
    ].join("\n"),
  },
  {
    pattern: /\bon:scroll\b/i,
    content: [
      "**`on:scroll`** — Scroll Event",
      "",
      "```html",
      "<div on:scroll=\"{handleScroll}\" style=\"overflow: auto; height: 200px;\">",
      "  Scrollable content",
      "</div>",
      "```",
      "",
      "**Event object:** `Event`",
      "**Properties:** `target.scrollTop`, `target.scrollLeft`, `target.scrollHeight`",
    ].join("\n"),
  },
  {
    pattern: /\bon:resize\b/i,
    content: [
      "**`on:resize`** — Resize Event",
      "",
      "```html",
      "<div on:resize=\"{handleResize}\">...</div>",
      "```",
      "",
      "**Event object:** `UIEvent`",
      "**Properties:** `target.offsetWidth`, `target.offsetHeight`",
    ].join("\n"),
  },
  {
    pattern: /\bon:load\b/i,
    content: [
      "**`on:load`** — Load Event",
      "",
      "Fires when an element (img, script, etc.) finishes loading.",
      "",
      "```html",
      "<img src=\"{url}\" on:load=\"{onImageLoad}\" on:error=\"{onImageError}\" />",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bon:error\b/i,
    content: [
      "**`on:error`** — Error Event",
      "",
      "Fires when an element fails to load.",
      "",
      "```html",
      "<img src=\"{url}\" on:error=\"{handleError}\" />",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bon:drag(start|end|over|enter|leave|drop)?\b/i,
    content: [
      "**`on:dragstart` / `on:drag` / `on:dragend` / `on:dragover` / `on:drop`** — Drag & Drop Events",
      "",
      "```html",
      "<div draggable=\"true\"",
      "     on:dragstart=\"{handleDragStart}\"",
      "     on:dragend=\"{handleDragEnd}\">",
      "  Drag me",
      "</div>",
      "",
      "<div on:dragover=\"{handleDragOver}\"",
      "     on:drop=\"{handleDrop}\"",
      "     on:dragleave=\"{handleDragLeave}\">",
      "  Drop here",
      "</div>",
      "```",
      "",
      "**Event object:** `DragEvent`",
      "**Properties:** `dataTransfer`, `dataTransfer.files`, `dataTransfer.getData()`",
    ].join("\n"),
  },
  {
    pattern: /\bon:touch(start|end|move)\b/i,
    content: [
      "**`on:touchstart` / `on:touchmove` / `on:touchend`** — Touch Events",
      "",
      "```html",
      "<div on:touchstart=\"{handleTouchStart}\"",
      "     on:touchmove=\"{handleTouchMove}\"",
      "     on:touchend=\"{handleTouchEnd}\">",
      "  Touch me",
      "</div>",
      "```",
      "",
      "**Event object:** `TouchEvent`",
      "**Properties:** `touches`, `targetTouches`, `changedTouches`",
      "**Touch properties:** `clientX`, `clientY`, `identifier`",
    ].join("\n"),
  },
  {
    pattern: /\bon:transitionend\b/i,
    content: [
      "**`on:transitionend`** — CSS Transition End Event",
      "",
      "```html",
      "<div class=\"{animated ? 'fade-in' : ''}\"",
      "     on:transitionend=\"{handleTransitionEnd}\">",
      "  Animated div",
      "</div>",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bon:animationend\b/i,
    content: [
      "**`on:animationend`** — CSS Animation End Event",
      "",
      "```html",
      "<div class=\"bounce\" on:animationend=\"{handleAnimEnd}\">",
      "  Bouncing div",
      "</div>",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bon:copy\b/i,
    content: ["**`on:copy`** — Copy to clipboard event. **Event:** `ClipboardEvent` | **Properties:** `clipboardData`"].join("\n"),
  },
  {
    pattern: /\bon:cut\b/i,
    content: ["**`on:cut`** — Cut from clipboard event. **Event:** `ClipboardEvent` | **Properties:** `clipboardData`"].join("\n"),
  },
  {
    pattern: /\bon:paste\b/i,
    content: ["**`on:paste`** — Paste from clipboard event. **Event:** `ClipboardEvent` | **Properties:** `clipboardData`, `clipboardData.getData('text')`"].join("\n"),
  },
  {
    pattern: /\bon:wheel\b/i,
    content: [
      "**`on:wheel`** — Mouse Wheel Event",
      "",
      "```html",
      "<div on:wheel=\"{handleWheel}\" style=\"overflow: auto;\">",
      "  Scrollable",
      "</div>",
      "```",
      "",
      "**Event object:** `WheelEvent`",
      "**Properties:** `deltaX`, `deltaY`, `deltaZ`, `deltaMode`",
    ].join("\n"),
  },
];

const STANDARD_EVENT_HOVERS: HoverEntry[] = [
  {
    pattern: /\bonclick\b/i,
    content: [
      "**`onclick`** — Click Event (Standard HTML)",
      "",
      "```html",
      "<button onclick=\"{handleClick}\">Click</button>",
      "```",
      "",
      "**Equivalent:** `on:click` (FlyFramework syntax)",
    ].join("\n"),
  },
  {
    pattern: /\boninput\b/i,
    content: [
      "**`oninput`** — Input Event (Standard HTML)",
      "",
      "```html",
      "<input oninput=\"{handleInput}\" />",
      "```",
      "",
      "**Equivalent:** `on:input` (FlyFramework syntax)",
    ].join("\n"),
  },
  {
    pattern: /\bonchange\b/i,
    content: [
      "**`onchange`** — Change Event (Standard HTML)",
      "",
      "**Equivalent:** `on:change` (FlyFramework syntax)",
    ].join("\n"),
  },
  {
    pattern: /\bonsubmit\b/i,
    content: [
      "**`onsubmit`** — Submit Event (Standard HTML)",
      "",
      "**Equivalent:** `on:submit` (FlyFramework syntax)",
    ].join("\n"),
  },
  {
    pattern: /\bonkeydown\b/i,
    content: ["**`onkeydown`** — Key Down (Standard HTML). **Equivalent:** `on:keydown`"].join("\n"),
  },
  {
    pattern: /\bonkeyup\b/i,
    content: ["**`onkeyup`** — Key Up (Standard HTML). **Equivalent:** `on:keyup`"].join("\n"),
  },
  {
    pattern: /\bonkeypress\b/i,
    content: ["**`onkeypress`** — Key Press (Standard HTML). **Equivalent:** `on:keypress`. Note: deprecated, use `onkeydown`."].join("\n"),
  },
  {
    pattern: /\bonfocus\b/i,
    content: ["**`onfocus`** — Focus (Standard HTML). **Equivalent:** `on:focus`"].join("\n"),
  },
  {
    pattern: /\bonblur\b/i,
    content: ["**`onblur`** — Blur (Standard HTML). **Equivalent:** `on:blur`"].join("\n"),
  },
  {
    pattern: /\bonmouseenter\b/i,
    content: ["**`onmouseenter`** — Mouse Enter (Standard HTML). **Equivalent:** `on:mouseenter`"].join("\n"),
  },
  {
    pattern: /\bonmouseleave\b/i,
    content: ["**`onmouseleave`** — Mouse Leave (Standard HTML). **Equivalent:** `on:mouseleave`"].join("\n"),
  },
  {
    pattern: /\bonmousemove\b/i,
    content: ["**`onmousemove`** — Mouse Move (Standard HTML). **Equivalent:** `on:mousemove`"].join("\n"),
  },
  {
    pattern: /\bonmousedown\b/i,
    content: ["**`onmousedown`** — Mouse Down (Standard HTML). **Event:** `MouseEvent`"].join("\n"),
  },
  {
    pattern: /\bonmouseup\b/i,
    content: ["**`onmouseup`** — Mouse Up (Standard HTML). **Event:** `MouseEvent`"].join("\n"),
  },
  {
    pattern: /\bonmouseover\b/i,
    content: ["**`onmouseover`** — Mouse Over (Standard HTML). Note: prefer `on:mouseenter`."].join("\n"),
  },
  {
    pattern: /\bonmouseout\b/i,
    content: ["**`onmouseout`** — Mouse Out (Standard HTML). Note: prefer `on:mouseleave`."].join("\n"),
  },
  {
    pattern: /\bondblclick\b/i,
    content: ["**`ondblclick`** — Double Click (Standard HTML). **Equivalent:** `on:dblclick`"].join("\n"),
  },
  {
    pattern: /\bonload\b/i,
    content: ["**`onload`** — Load Event (Standard HTML). **Equivalent:** `on:load`"].join("\n"),
  },
  {
    pattern: /\bonerror\b/i,
    content: ["**`onerror`** — Error Event (Standard HTML). **Equivalent:** `on:error`"].join("\n"),
  },
  {
    pattern: /\bonscroll\b/i,
    content: ["**`onscroll`** — Scroll Event (Standard HTML). **Equivalent:** `on:scroll`"].join("\n"),
  },
  {
    pattern: /\bonresize\b/i,
    content: ["**`onresize`** — Resize Event (Standard HTML). **Equivalent:** `on:resize`"].join("\n"),
  },
  {
    pattern: /\bondragstart\b/i,
    content: ["**`ondragstart`** — Drag Start (Standard HTML). **Equivalent:** `on:dragstart`"].join("\n"),
  },
  {
    pattern: /\bondragend\b/i,
    content: ["**`ondragend`** — Drag End (Standard HTML). **Equivalent:** `on:dragend`"].join("\n"),
  },
  {
    pattern: /\bondragover\b/i,
    content: ["**`ondragover`** — Drag Over (Standard HTML). **Equivalent:** `on:dragover`"].join("\n"),
  },
  {
    pattern: /\bondrop\b/i,
    content: ["**`ondrop`** — Drop (Standard HTML). **Equivalent:** `on:drop`"].join("\n"),
  },
  {
    pattern: /\boncopy\b/i,
    content: ["**`oncopy`** — Copy (Standard HTML). **Equivalent:** `on:copy`"].join("\n"),
  },
  {
    pattern: /\boncut\b/i,
    content: ["**`oncut`** — Cut (Standard HTML). **Equivalent:** `on:cut`"].join("\n"),
  },
  {
    pattern: /\bonpaste\b/i,
    content: ["**`onpaste`** — Paste (Standard HTML). **Equivalent:** `on:paste`"].join("\n"),
  },
  {
    pattern: /\bonwheel\b/i,
    content: ["**`onwheel`** — Wheel (Standard HTML). **Equivalent:** `on:wheel`"].join("\n"),
  },
  {
    pattern: /\boncontextmenu\b/i,
    content: ["**`oncontextmenu`** — Context Menu (Standard HTML). **Equivalent:** `on:contextmenu`"].join("\n"),
  },
  {
    pattern: /\bontransitionend\b/i,
    content: ["**`ontransitionend`** — Transition End (Standard HTML). **Equivalent:** `on:transitionend`"].join("\n"),
  },
  {
    pattern: /\bonanimationend\b/i,
    content: ["**`onanimationend`** — Animation End (Standard HTML). **Equivalent:** `on:animationend`"].join("\n"),
  },
  {
    pattern: /\bonbeforeinput\b/i,
    content: ["**`onbeforeinput`** — Before Input (Standard HTML). Fires before `oninput`. **Event:** `InputEvent`"].join("\n"),
  },
];

const FLY_DIRECTIVE_HOVERS: HoverEntry[] = [
  {
    pattern: /\bif\s*=/,
    content: [
      "**`if`** — Conditional Rendering",
      "",
      "Renders the element only if the expression is truthy.",
      "",
      "```html",
      "<div if=\"{isLoggedIn}\">Welcome, {user.name}!</div>",
      "<div if=\"{count > 0}\">You have {count} items</div>",
      "<div if=\"{user.role === 'admin'}\">Admin Panel</div>",
      "<div if=\"{items.length === 0}\">No items</div>",
      "```",
      "",
      "**Truthy values:** `true`, non-zero numbers, non-empty strings, non-null objects",
      "**Falsy values:** `false`, `0`, `''`, `null`, `undefined`",
    ].join("\n"),
  },
  {
    pattern: /\bfor\s*=/,
    content: [
      "**`for`** — List Rendering",
      "",
      "Iterates over a collection and renders the element for each item.",
      "",
      "```html",
      "<!-- Simple loop -->",
      "<div for=\"{item of items}\">{item.name}</div>",
      "",
      "<!-- With index -->",
      "<div for=\"{(item, index) of items}\">{index}: {item.name}</div>",
      "",
      "<!-- Objects -->",
      "<div for=\"{user of users}\">",
      "  <span>{user.name}</span>",
      "  <span>{user.email}</span>",
      "</div>",
      "",
      "<!-- Numbers -->",
      "<div for=\"{i of [1,2,3,4,5]}\">{i}</div>",
      "",
      "<!-- Strings -->",
      "<div for=\"{color of ['red','green','blue']}\">",
      "  <span style=\"color: {color}\">{color}</span>",
      "</div>",
      "```",
      "",
      "**Syntax:** `{item of collection}` or `{(item, index) of collection}`",
      "",
      "**Works with:** Arrays, strings, Maps, Sets, any iterable",
    ].join("\n"),
  },
  {
    pattern: /\belse\b(?=\s*=|>|$)/,
    content: [
      "**`else`** — Alternative Rendering",
      "",
      "Renders when the preceding `if` condition is falsy.",
      "",
      "```html",
      "<div if=\"{isLoggedIn}\">Welcome back!</div>",
      "<div else>Please <a href=\"/login\">log in</a></div>",
      "",
      "<div if=\"{count > 0}\">You have {count} items</div>",
      "<div else>Your cart is empty</div>",
      "```",
      "",
      "**Must follow an `if` element** (not necessarily immediately).",
    ].join("\n"),
  },
  {
    pattern: /\bdraggable\s*=/,
    content: [
      "**`draggable`** — Drag Enable Attribute",
      "",
      "```html",
      "<div draggable=\"true\" on:dragstart=\"{handleDrag}\">Drag me</div>",
      "```",
    ].join("\n"),
  },
];

const TEMPLATE_EXPRESSION_HOVERS: HoverEntry[] = [
  {
    pattern: /\{data\.\w+\}/,
    content: [
      "**Template Expression** — Access loader data",
      "",
      "Access properties returned by `loader()`.",
      "",
      "```typescript",
      "export async function loader() {",
      "  return { data: { users: [], count: 42 } };",
      "}",
      "```",
      "",
      "```html",
      "<div>{data.count}</div>",
      "<div for=\"{user of data.users}\">{user.name}</div>",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\{params\.\w+\}/,
    content: [
      "**Template Expression** — Access route params",
      "",
      "Access dynamic route parameters.",
      "",
      "```html",
      "<!-- Route: /users/:id -->",
      "<h1>User {params.id}</h1>",
      "```",
    ].join("\n"),
  },
];

const CSS_HOVERS: HoverEntry[] = [
  {
    pattern: /\bdisplay\s*:/i,
    content: [
      "**`display`** — CSS Display Property",
      "",
      "```css",
      ".flex   { display: flex; }",
      ".grid   { display: grid; }",
      ".block  { display: block; }",
      ".inline { display: inline; }",
      ".none   { display: none; }",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bposition\s*:/i,
    content: [
      "**`position`** — CSS Position Property",
      "",
      "```css",
      "static   { position: static; }    /* default */",
      "relative { position: relative; }  /* relative to normal position */",
      "absolute { position: absolute; }  /* relative to nearest positioned ancestor */",
      "fixed    { position: fixed; }     /* relative to viewport */",
      "sticky   { position: sticky; }    /* toggle between relative and fixed */",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bgap\s*:/i,
    content: [
      "**`gap`** — CSS Gap Property (Flexbox/Grid)",
      "",
      "```css",
      ".container { gap: 16px; }",
      ".container { row-gap: 16px; column-gap: 8px; }",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bflex\s*:/i,
    content: [
      "**`flex`** — CSS Flex Shorthand",
      "",
      "```css",
      ".item { flex: 1; }              /* grow equally */",
      ".item { flex: 0 0 200px; }      /* fixed width */",
      ".item { flex: 1 1 auto; }       /* grow and shrink */",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bgrid\s*:/i,
    content: [
      "**`grid`** — CSS Grid Shorthand",
      "",
      "```css",
      ".container { grid-template-columns: repeat(3, 1fr); }",
      ".container { grid-template-rows: auto 1fr auto; }",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\btransition\s*:/i,
    content: [
      "**`transition`** — CSS Transition",
      "",
      "```css",
      ".element { transition: all 0.3s ease; }",
      ".element { transition: opacity 0.5s ease-in-out; }",
      ".element { transition: transform 0.2s ease, opacity 0.2s ease; }",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\banimation\s*:/i,
    content: [
      "**`animation`** — CSS Animation",
      "",
      "```css",
      ".bounce { animation: bounce 0.5s ease infinite; }",
      "@keyframes bounce { 50% { transform: translateY(-10px); } }",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\btransform\s*:/i,
    content: [
      "**`transform`** — CSS Transform",
      "",
      "```css",
      ".rotate  { transform: rotate(45deg); }",
      ".scale   { transform: scale(1.5); }",
      ".translate { transform: translateX(10px) translateY(-5px); }",
      ".skew    { transform: skewX(10deg); }",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\boverflow\s*:/i,
    content: [
      "**`overflow`** — CSS Overflow",
      "",
      "```css",
      "visible  { overflow: visible; }  /* default */",
      "hidden   { overflow: hidden; }   /* clip content */",
      "scroll   { overflow: scroll; }   /* always show scrollbar */",
      "auto     { overflow: auto; }     /* show scrollbar if needed */",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bcolor\s*:/i,
    content: [
      "**`color`** — CSS Color (text color)",
      "",
      "```css",
      ".text { color: #333; }",
      ".text { color: rgb(255, 255, 255); }",
      ".text { color: hsl(200, 100%, 50%); }",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bbackground(-color)?\s*:/i,
    content: [
      "**`background`** — CSS Background",
      "",
      "```css",
      ".bg { background: #fff; }",
      ".bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }",
      ".bg { background: url('/image.jpg') center/cover no-repeat; }",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bopacity\s*:/i,
    content: ["**`opacity`** — CSS Opacity (0 = transparent, 1 = opaque). Supports CSS transitions for fade effects."].join("\n"),
  },
  {
    pattern: /\bcursor\s*:/i,
    content: [
      "**`cursor`** — CSS Cursor",
      "",
      "```css",
      ".pointer  { cursor: pointer; }   /* hand icon */",
      ".grab     { cursor: grab; }      /* drag icon */",
      ".not-allow { cursor: not-allowed; }",
      ".wait     { cursor: wait; }      /* loading */",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bz-index\s*:/i,
    content: ["**`z-index`** — CSS Z-Index (stacking order). Default: `auto` (0). Higher values appear on top."].join("\n"),
  },
  {
    pattern: /\bborder-radius\s*:/i,
    content: [
      "**`border-radius`** — CSS Border Radius",
      "",
      "```css",
      ".rounded { border-radius: 8px; }",
      ".circle  { border-radius: 50%; }",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bbox-shadow\s*:/i,
    content: [
      "**`box-shadow`** — CSS Box Shadow",
      "",
      "```css",
      ".shadow { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }",
      ".shadow { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }",
      "```",
    ].join("\n"),
  },
];

const HTML_ATTRIBUTE_HOVERS: HoverEntry[] = [
  {
    pattern: /\bclass\s*=/i,
    content: [
      "**`class`** — CSS Class Attribute",
      "",
      "```html",
      "<div class=\"container\">Static class</div>",
      "<div class=\"{isActive ? 'active' : 'inactive'}\">Dynamic class</div>",
      "<div class=\"btn {large ? 'btn-lg' : ''}\">Conditional class</div>",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bstyle\s*=/i,
    content: [
      "**`style`** — Inline CSS",
      "",
      "```html",
      "<div style=\"color: red; font-size: 16px;\">Static styles</div>",
      "<div style=\"color: {color}; opacity: {isVisible ? 1 : 0}\">Dynamic styles</div>",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bplaceholder\s*=/i,
    content: ["**`placeholder`** — Placeholder text shown when input is empty."].join("\n"),
  },
  {
    pattern: /\bdisabled\s*=/i,
    content: [
      "**`disabled`** — Disable Element",
      "",
      "```html",
      "<button disabled=\"{isLoading}\">Submit</button>",
      "<input disabled=\"{isReadOnly}\" />",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\breadonly\s*=/i,
    content: ["**`readonly`** — Make input read-only. User can see value but cannot edit."].join("\n"),
  },
  {
    pattern: /\brequired\s*=/i,
    content: ["**`required`** — Mark field as required for form validation."].join("\n"),
  },
  {
    pattern: /\bhref\s*=/i,
    content: [
      "**`href`** — Hyperlink URL",
      "",
      "```html",
      "<a href=\"/about\">About</a>",
      "<a href=\"/users/{id}\">User {id}</a>",
      "<a href=\"https://google.com\" target=\"_blank\">External</a>",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bsrc\s*=/i,
    content: [
      "**`src`** — Source URL (img, video, audio, script, iframe)",
      "",
      "```html",
      "<img src=\"{imageUrl}\" alt=\"Photo\" />",
      "<video src=\"/video.mp4\"></video>",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\balt\s*=/i,
    content: ["**`alt`** — Alternative text for images. Required for accessibility."].join("\n"),
  },
  {
    pattern: /\btarget\s*=/i,
    content: [
      "**`target`** — Link target",
      "",
      "```html",
      "<a href=\"/page\" target=\"_self\">Same window</a>",
      "<a href=\"/page\" target=\"_blank\">New tab</a>",
      "```",
      "",
      "Values: `_self`, `_blank`, `_parent`, `_top`, or frame name",
    ].join("\n"),
  },
  {
    pattern: /\brel\s*=/i,
    content: [
      "**`rel`** — Relationship",
      "",
      "```html",
      "<a href=\"https://ext.com\" target=\"_blank\" rel=\"noopener noreferrer\">External</a>",
      "<link rel=\"stylesheet\" href=\"/style.css\" />",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bvalue\s*=/i,
    content: [
      "**`value`** — Element Value",
      "",
      "```html",
      "<input value=\"{name}\" />",
      "<select value=\"{selected}\">...</select>",
      "<option value=\"opt1\">Option 1</option>",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bname\s*=/i,
    content: ["**`name`** — Element name. Used for form submission and grouping radio buttons."].join("\n"),
  },
  {
    pattern: /\bid\s*=/i,
    content: ["**`id`** — Unique identifier. Used for `document.getElementById()`, labels, and CSS `#id` selectors."].join("\n"),
  },
  {
    pattern: /\btype\s*=/i,
    content: [
      "**`type`** — Element Type",
      "",
      "For `<input>`: text, password, email, number, checkbox, radio, file, submit, search, date, time, color, range, url, tel, hidden",
      "For `<button>`: submit, button, reset",
      "For `<script>`: module, text/javascript",
      "For `<link>`: stylesheet, icon, preload",
    ].join("\n"),
  },
  {
    pattern: /\bmin\s*=/i,
    content: ["**`min`** — Minimum value (input[type=number], input[type=date], input[type=range])."].join("\n"),
  },
  {
    pattern: /\bmax\s*=/i,
    content: ["**`max`** — Maximum value (input[type=number], input[type=date], input[type=range])."].join("\n"),
  },
  {
    pattern: /\bstep\s*=/i,
    content: ["**`step`** — Step increment (input[type=number], input[type=range]). Default: 1."].join("\n"),
  },
  {
    pattern: /\bminlength\s*=/i,
    content: ["**`minlength`** — Minimum character length for text inputs."].join("\n"),
  },
  {
    pattern: /\bmaxlength\s*=/i,
    content: ["**`maxlength`** — Maximum character length for text inputs/textarea."].join("\n"),
  },
  {
    pattern: /\brows\s*=/i,
    content: ["**`rows`** — Number of visible text lines for `<textarea>`."].join("\n"),
  },
  {
    pattern: /\bcols\s*=/i,
    content: ["**`cols`** — Number of visible characters per line for `<textarea>`."].join("\n"),
  },
  {
    pattern: /\bautofocus\s*=/i,
    content: ["**`autofocus`** — Automatically focus element when page loads."].join("\n"),
  },
  {
    pattern: /\bmultiple\s*=/i,
    content: ["**`multiple`** — Allow multiple selections (select, input[type=file])."].join("\n"),
  },
  {
    pattern: /\bchecked\s*=/i,
    content: [
      "**`checked`** — Checkbox/Radio state",
      "",
      "```html",
      "<input type=\"checkbox\" checked=\"{isActive}\" />",
      "<input type=\"radio\" name=\"opt\" value=\"a\" checked=\"{selected === 'a'}\" />",
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bselected\s*=/i,
    content: ["**`selected`** — Pre-select an `<option>` in a `<select>`."].join("\n"),
  },
  {
    pattern: /\benctype\s*=/i,
    content: [
      "**`enctype`** — Form encoding type",
      "",
      "- `application/x-www-form-urlencoded` (default)",
      "- `multipart/form-data` (file uploads)",
      "- `text/plain`",
    ].join("\n"),
  },
  {
    pattern: /\bnovalidate\s*=/i,
    content: ["**`novalidate`** — Disable browser form validation."].join("\n"),
  },
  {
    pattern: /\bloading\s*=/i,
    content: ["**`loading`** — Image lazy loading. Values: `lazy` (load when visible), `eager` (load immediately)."].join("\n"),
  },
  {
    pattern: /\bwidth\s*=/i,
    content: ["**`width`** — Element width. For `<img>`: intrinsic width in pixels. For layout: CSS width."].join("\n"),
  },
  {
    pattern: /\bheight\s*=/i,
    content: ["**`height`** — Element height. For `<img>`: intrinsic height in pixels. For layout: CSS height."].join("\n"),
  },
  {
    pattern: /\bdownload\s*=/i,
    content: ["**`download`** — Download attribute. Triggers file download instead of navigation."].join("\n"),
  },
  {
    pattern: /\baction\s*=/i,
    content: ["**`action`** — Form submission URL. If omitted, submits to current page."].join("\n"),
  },
  {
    pattern: /\bmethod\s*=/i,
    content: ["**`method`** — HTTP method for form submission. Values: `GET` (default), `POST`."].join("\n"),
  },
];

const FLY_CONFIG_HOVERS: HoverEntry[] = [
  {
    pattern: /\bappDir\s*:/,
    content: [
      "**`appDir`** — Application Directory",
      "",
      "Path to the directory containing `.fly` page files.",
      "",
      "```typescript",
      'appDir: "./app",     // relative to project root',
      'appDir: "./src/app", // nested structure',
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bsiteUrl\s*:/,
    content: [
      "**`siteUrl`** — Base URL",
      "",
      "The production URL. Used for sitemap, canonical URLs, and OpenGraph.",
      "",
      "```typescript",
      'siteUrl: "https://mysite.com",',
      "```",
    ].join("\n"),
  },
  {
    pattern: /\badapter\s*:/,
    content: [
      "**`adapter`** — Deployment Target",
      "",
      "```typescript",
      'adapter: "node",       // Node.js server (default)',
      'adapter: "edge",       // Edge runtime (Cloudflare, Vercel Edge)',
      'adapter: "serverless", // Serverless functions (AWS Lambda, Vercel)',
      "```",
    ].join("\n"),
  },
  {
    pattern: /\bminify\s*:/,
    content: ["**`minify`** — Minify production build. Default: `true`."].join("\n"),
  },
  {
    pattern: /\bsourcemap\s*:/,
    content: ["**`sourcemap`** — Generate source maps. Default: `false`."].join("\n"),
  },
  {
    pattern: /\bdefineConfig\s*\(/,
    content: [
      "**`defineConfig()`** — Type-Safe Configuration Helper",
      "",
      "```typescript",
      'import { defineConfig } from "fly-framework/src/core/config";',
      "",
      "export default defineConfig({",
      '  appDir: "./app",',
      '  siteUrl: "https://mysite.com",',
      '  adapter: "node",',
      "  build: { minify: true, sourcemap: false }",
      "});",
      "```",
    ].join("\n"),
  },
];

const ALL_HOVERS: HoverEntry[] = [
  ...FLY_API_HOVERS,
  ...FLY_EVENT_HOVERS,
  ...STANDARD_EVENT_HOVERS,
  ...FLY_DIRECTIVE_HOVERS,
  ...HTML_ELEMENT_HOVERS,
  ...HTML_ATTRIBUTE_HOVERS,
  ...TEMPLATE_EXPRESSION_HOVERS,
  ...CSS_HOVERS,
  ...FLY_CONFIG_HOVERS,
];

export class FlyHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const line = document.lineAt(position.line).text;
    const wordRange = document.getWordRangeAtPosition(position);
    const word = wordRange ? document.getText(wordRange) : "";

    for (const { pattern, content } of ALL_HOVERS) {
      if (pattern.test(line) || (word && pattern.test(word))) {
        const markdown = new vscode.MarkdownString(content);
        markdown.isTrusted = true;
        return new vscode.Hover(markdown);
      }
    }

    const hoverFromContext = this.getContextHover(document, position);
    if (hoverFromContext) return hoverFromContext;

    return null;
  }

  private getContextHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | null {
    const line = document.lineAt(position.line).text;

    const stateVarMatch = line.match(/\b(let|const|var)\s+(\w+)\s*=\s*\$state\s*\(\s*(\w+)?/);
    if (stateVarMatch) {
      const varName = stateVarMatch[2];
      const initialValue = stateVarMatch[3];
      let typeStr = "any";
      if (initialValue) {
        if (/^\d+(\.\d+)?$/.test(initialValue)) typeStr = "number";
        else if (/^['"`]/.test(initialValue)) typeStr = "string";
        else if (/^(true|false)$/.test(initialValue)) typeStr = "boolean";
        else if (/^\{/.test(initialValue)) typeStr = "object";
        else if (/^\[/.test(initialValue)) typeStr = "array";
      }
      const md = new vscode.MarkdownString([
        `**\`${varName}\`** — Reactive State Variable`,
        "",
        `**Type:** \`${typeStr}\``,
        `**Initial value:** \`${initialValue ?? "undefined"}\``,
        "",
        "```typescript",
        `let ${varName} = $state(${initialValue ?? ""});`,
        "```",
        "",
        "Automatically updates the UI when changed.",
      ].join("\n"));
      md.isTrusted = true;
      return new vscode.Hover(md);
    }

    const loaderMatch = line.match(/export\s+(async\s+)?function\s+loader\s*\(\s*\{([^}]*)\}/);
    if (loaderMatch) {
      const params = loaderMatch[2].split(",").map((p: string) => p.trim()).filter(Boolean);
      const md = new vscode.MarkdownString([
        "**loader() Context Parameters:**",
        "",
        ...params.map((p) => {
          const clean = p.replace(/[:=].*$/, "").trim();
          const types: Record<string, string> = {
            request: "Request",
            params: "Record<string, string>",
            cache: "DataCache",
            url: "URL",
            flyUtils: "FlyUtils",
          };
          return `- \`${clean}\`: \`${types[clean] ?? "any"}\``;
        }),
        "",
        "```typescript",
        `export async function loader({ ${params.join(", ")} }) {`,
        "  return { data: {} };",
        "}",
        "```",
      ].join("\n"));
      md.isTrusted = true;
      return new vscode.Hover(md);
    }

    const metaMatch = line.match(/export\s+function\s+meta\s*\(\s*\{([^}]*)\}/);
    if (metaMatch) {
      const md = new vscode.MarkdownString([
        "**meta() Context Parameters:**",
        "",
        "- `data`: Return value from `loader()`",
        "- `params`: Route parameters",
        "",
        "**Returns:** `{",
        "  title?: string;",
        "  description?: string;",
        "  canonical?: string;",
        "  openGraph?: Record<string, any>;",
        "  twitter?: Record<string, any>;",
        "  jsonLd?: Record<string, any>;",
        "}`",
      ].join("\n"));
      md.isTrusted = true;
      return new vscode.Hover(md);
    }

    const apiMatch = line.match(/export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*\{([^}]*)\}/);
    if (apiMatch) {
      const method = apiMatch[2];
      const params = apiMatch[3].split(",").map((p: string) => p.trim()).filter(Boolean);
      const md = new vscode.MarkdownString([
        `**${method}() Context Parameters:**`,
        "",
        ...params.map((p) => {
          const clean = p.replace(/[:=].*$/, "").trim();
          const types: Record<string, string> = {
            request: "Request",
            params: "Record<string, string>",
            url: "URL",
          };
          return `- \`${clean}\`: \`${types[clean] ?? "any"}\``;
        }),
        "",
        "```typescript",
        `export async function ${method}({ ${params.join(", ")} }) {`,
        "  return Response.json({ ok: true });",
        "}",
        "```",
      ].join("\n"));
      md.isTrusted = true;
      return new vscode.Hover(md);
    }

    const middlewareMatch = line.match(/export\s+default\s+(async\s+)?function\s+middleware\s*\(\s*\{([^}]*)\}/);
    if (middlewareMatch) {
      const md = new vscode.MarkdownString([
        "**middleware() Context Parameters:**",
        "",
        "- `request`: `Request` — incoming HTTP request",
        "- `next`: `() => Response | null` — continue to route handler",
        "",
        "**Returns:** `Response | null`",
      ].join("\n"));
      md.isTrusted = true;
      return new vscode.Hover(md);
    }

    const cacheMatch = line.match(/cache\.fetch\s*\(\s*['"]([^'"]+)['"]/);
    if (cacheMatch) {
      const key = cacheMatch[1];
      const md = new vscode.MarkdownString([
        `**cache.fetch()** — Cached Data Fetch`,
        "",
        `**Cache key:** \`${key}\``,
        "",
        "```typescript",
        `const data = await cache.fetch('${key}', async () => {`,
        "  // producer (called only on cache miss)",
        "}, { ttl: 60, tags: ['tag'] });",
        "```",
      ].join("\n"));
      md.isTrusted = true;
      return new vscode.Hover(md);
    }

    return null;
  }
}
