import * as vscode from "vscode";

interface FlyScriptItem {
  label: string;
  kind: vscode.CompletionItemKind;
  detail: string;
  documentation: string;
  insertText: string | vscode.SnippetString;
  sortPriority?: string;
}

const FLY_SCRIPT_ITEMS: FlyScriptItem[] = [
  // Directives
  {
    label: '"use server"',
    kind: vscode.CompletionItemKind.Keyword,
    detail: '"use server" — Server Actions',
    documentation: "All exported functions become server actions callable from the client via RPC.",
    insertText: new vscode.SnippetString('"use server";'),
    sortPriority: "0",
  },
  {
    label: '"use client"',
    kind: vscode.CompletionItemKind.Keyword,
    detail: '"use client" — Client Only',
    documentation: "Component only runs in the browser. No server functions available.",
    insertText: new vscode.SnippetString('"use client";'),
    sortPriority: "0",
  },

  // State
  {
    label: "$state",
    kind: vscode.CompletionItemKind.Function,
    detail: "$state(initialValue) — Reactive State",
    documentation: "Declares a reactive state variable. UI updates automatically.\n\n```typescript\nlet count = $state(0);\nlet name = $state('');\nlet user = $state({ name: '' });\nlet items = $state([]);\nlet flag = $state(false);\nlet value = $state(null);\n```",
    insertText: new vscode.SnippetString("${1:variable} = $state(${2:0})"),
    sortPriority: "1",
  },

  // Server Exports
  {
    label: "loader",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export async function loader({ request, params, cache, url })",
    documentation: "Server-side data loader. Returns `{ data }` passed to template and `meta()`.\n\n```typescript\nexport async function loader({ request, params, cache, url }) {\n  const data = await cache.fetch('key', async () => fetch('/api').then(r => r.json()));\n  return { data };\n}\n```",
    insertText: new vscode.SnippetString(
      "export async function loader({ request, params }) {\n  return { data: ${1:{}} };\n}"
    ),
    sortPriority: "2",
  },
  {
    label: "meta",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export function meta({ data, params })",
    documentation: "SEO metadata: title, description, canonical, openGraph, twitter, jsonLd.\n\n```typescript\nexport function meta({ data }) {\n  return {\n    title: 'Page',\n    description: 'Description',\n    openGraph: { title: 'OG' },\n    jsonLd: { '@type': 'WebPage' }\n  };\n}\n```",
    insertText: new vscode.SnippetString(
      "export function meta({ data }) {\n  return { title: ${1:\"Page Title\"} };\n}"
    ),
    sortPriority: "2",
  },
  {
    label: "generateStaticParams",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export async function generateStaticParams()",
    documentation: "Returns array of param objects for SSG. Use with `export const prerender = true;`.\n\n```typescript\nexport async function generateStaticParams() {\n  return [{ id: '1' }, { id: '2' }];\n}\n```",
    insertText: new vscode.SnippetString(
      "export async function generateStaticParams() {\n  return [${1:{ id: \"1\" }}];\n}"
    ),
    sortPriority: "2",
  },
  {
    label: "middleware",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export default async function middleware({ request, next })",
    documentation: "Request middleware. Runs before route handling.\n\n```typescript\nexport default async function middleware({ request, next }) {\n  const session = request.headers.get('cookie');\n  if (!session) return Response.redirect('/login', 302);\n  return next();\n}\n```",
    insertText: new vscode.SnippetString(
      "export default async function middleware({ request, next }) {\n  ${1:// guard logic}\n  return next();\n}"
    ),
    sortPriority: "2",
  },

  // API Handlers
  {
    label: "GET",
    kind: vscode.CompletionItemKind.Function,
    detail: "export async function GET({ request, params, url })",
    documentation: "Handles GET requests.\n\n```typescript\nexport async function GET({ request, params, url }) {\n  return Response.json({ users: [] });\n}\n```",
    insertText: new vscode.SnippetString(
      "export async function GET({ request, params }) {\n  return Response.json(${1:{ ok: true }});\n}"
    ),
    sortPriority: "3",
  },
  {
    label: "POST",
    kind: vscode.CompletionItemKind.Function,
    detail: "export async function POST({ request, params, url })",
    documentation: "Handles POST requests.\n\n```typescript\nexport async function POST({ request, params }) {\n  const body = await request.json();\n  return Response.json({ created: true, ...body }, { status: 201 });\n}\n```",
    insertText: new vscode.SnippetString(
      "export async function POST({ request, params }) {\n  const body = await request.json();\n  return Response.json(${1:{ created: true, ...body }});\n}"
    ),
    sortPriority: "3",
  },
  {
    label: "PUT",
    kind: vscode.CompletionItemKind.Function,
    detail: "export async function PUT({ request, params, url })",
    documentation: "Handles PUT requests.",
    insertText: new vscode.SnippetString(
      "export async function PUT({ request, params }) {\n  const body = await request.json();\n  return Response.json(${1:{ updated: true }});\n}"
    ),
    sortPriority: "3",
  },
  {
    label: "PATCH",
    kind: vscode.CompletionItemKind.Function,
    detail: "export async function PATCH({ request, params, url })",
    documentation: "Handles PATCH requests.",
    insertText: new vscode.SnippetString(
      "export async function PATCH({ request, params }) {\n  const body = await request.json();\n  return Response.json(${1:{ patched: true }});\n}"
    ),
    sortPriority: "3",
  },
  {
    label: "DELETE",
    kind: vscode.CompletionItemKind.Function,
    detail: "export async function DELETE({ request, params, url })",
    documentation: "Handles DELETE requests.",
    insertText: new vscode.SnippetString(
      "export async function DELETE({ request, params }) {\n  return Response.json(${1:{ deleted: true }});\n}"
    ),
    sortPriority: "3",
  },

  // Config Exports
  {
    label: "render",
    kind: vscode.CompletionItemKind.Property,
    detail: 'export const render = "client" | "stream" | "pipe"',
    documentation: "Rendering mode:\n- `client`: CSR, JS hydrates\n- `stream`: SSR streaming with loading.fly\n- `pipe`: progressive rendering",
    insertText: new vscode.SnippetString('export const render = "${1|client,stream,pipe}";'),
    sortPriority: "4",
  },
  {
    label: "revalidate",
    kind: vscode.CompletionItemKind.Property,
    detail: "export const revalidate = <seconds>",
    documentation: "ISR interval. Page re-generates after N seconds.\n\n```typescript\nexport const revalidate = 60;\n```",
    insertText: new vscode.SnippetString("export const revalidate = ${1:60};"),
    sortPriority: "4",
  },
  {
    label: "prerender",
    kind: vscode.CompletionItemKind.Property,
    detail: "export const prerender = true",
    documentation: "Enable SSG. Page is pre-rendered at build time.",
    insertText: new vscode.SnippetString("export const prerender = true;"),
    sortPriority: "4",
  },

  // Cache & Utils
  {
    label: "cache.fetch",
    kind: vscode.CompletionItemKind.Function,
    detail: "await cache.fetch(key, producer, opts?)",
    documentation: "Cached data fetch. Producer runs only on miss.\n\n```typescript\nconst data = await cache.fetch('users', async () => {\n  return await db.query('SELECT * FROM users');\n}, { ttl: 60, tags: ['users'] });\n```",
    insertText: new vscode.SnippetString(
      'await cache.fetch("${1:key}", async () => {\n  ${2:// producer}\n}, { ttl: ${3:60}, tags: ["${4:tag}"] })'
    ),
    sortPriority: "5",
  },
  {
    label: "flyUtils.redirect",
    kind: vscode.CompletionItemKind.Function,
    detail: "flyUtils.redirect(path, status?)",
    documentation: "Server redirect.\n\n```typescript\nflyUtils.redirect('/login');        // 302\nflyUtils.redirect('/new', 301);     // permanent\n```",
    insertText: new vscode.SnippetString('flyUtils.redirect("${1:/new-path}");'),
    sortPriority: "5",
  },
  {
    label: "flyUtils.notFound",
    kind: vscode.CompletionItemKind.Function,
    detail: "flyUtils.notFound()",
    documentation: "Throw 404. Renders error.fly if available.",
    insertText: new vscode.SnippetString("flyUtils.notFound();"),
    sortPriority: "5",
  },
  {
    label: "flyUtils.revalidateTag",
    kind: vscode.CompletionItemKind.Function,
    detail: "flyUtils.revalidateTag(tag)",
    documentation: "Invalidate cache entries by tag.\n\n```typescript\nflyUtils.revalidateTag('users');\n```",
    insertText: new vscode.SnippetString('flyUtils.revalidateTag("${1:tag}");'),
    sortPriority: "5",
  },
  {
    label: "flyUtils.revalidatePath",
    kind: vscode.CompletionItemKind.Function,
    detail: "flyUtils.revalidatePath(path)",
    documentation: "Invalidate route cache by path.",
    insertText: new vscode.SnippetString('flyUtils.revalidatePath("${1:/path}");'),
    sortPriority: "5",
  },

  // Standard Exports
  {
    label: "export default function",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export default function name()",
    documentation: "Default export function.",
    insertText: new vscode.SnippetString("export default function ${1:name}(${2:params}) {\n  ${3}\n}"),
    sortPriority: "6",
  },
  {
    label: "export function",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export function name()",
    documentation: "Named export function.",
    insertText: new vscode.SnippetString("export function ${1:name}(${2:params}) {\n  ${3}\n}"),
    sortPriority: "6",
  },
  {
    label: "export async function",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export async function name()",
    documentation: "Named async export function.",
    insertText: new vscode.SnippetString("export async function ${1:name}(${2:params}) {\n  ${3}\n}"),
    sortPriority: "6",
  },
  {
    label: "export const",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export const name = value",
    documentation: "Named export constant.",
    insertText: new vscode.SnippetString("export const ${1:name} = ${2:value};"),
    sortPriority: "6",
  },
  {
    label: "export let",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export let name = value",
    documentation: "Named export variable.",
    insertText: new vscode.SnippetString("export let ${1:name} = ${2:value};"),
    sortPriority: "6",
  },
  {
    label: "export type",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export type Name = { ... }",
    documentation: "Named type export.",
    insertText: new vscode.SnippetString("export type ${1:Name} = {\n  ${2:key}: ${3:type};\n};"),
    sortPriority: "6",
  },
  {
    label: "export interface",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "export interface Name { ... }",
    documentation: "Named interface export.",
    insertText: new vscode.SnippetString("export interface ${1:Name} {\n  ${2:key}: ${3:type};\n}"),
    sortPriority: "6",
  },

  // Common patterns
  {
    label: "let state = $state",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "let name = $state(initialValue)",
    documentation: "Reactive state variable declaration.",
    insertText: new vscode.SnippetString("let ${1:name} = $state(${2:0});"),
    sortPriority: "7",
  },
  {
    label: "const state = $state",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "const name = $state(initialValue)",
    documentation: "Reactive state constant declaration.",
    insertText: new vscode.SnippetString("const ${1:name} = $state(${2:0});"),
    sortPriority: "7",
  },
  {
    label: "return { data }",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "return { data: { ... } }",
    documentation: "Standard loader return value.",
    insertText: new vscode.SnippetString("return { data: ${1:{}} };"),
    sortPriority: "7",
  },
  {
    label: "return { errors }",
    kind: vscode.CompletionItemKind.Snippet,
    detail: "return { errors: { ... } }",
    documentation: "Standard action error return.",
    insertText: new vscode.SnippetString("return { errors: ${1:{}} };"),
    sortPriority: "7",
  },
  {
    label: "Response.json",
    kind: vscode.CompletionItemKind.Function,
    detail: "Response.json(data, init?)",
    documentation: "Create a JSON Response.\n\n```typescript\nreturn Response.json({ ok: true });\nreturn Response.json({ error: 'msg' }, { status: 400 });\n```",
    insertText: new vscode.SnippetString("Response.json(${1:{ ok: true }})"),
    sortPriority: "7",
  },
  {
    label: "Response.redirect",
    kind: vscode.CompletionItemKind.Function,
    detail: "Response.redirect(url, status?)",
    documentation: "Create a redirect Response.\n\n```typescript\nreturn Response.redirect('/login', 302);\n```",
    insertText: new vscode.SnippetString("Response.redirect('${1:/path}', ${2:302})"),
    sortPriority: "7",
  },
  {
    label: "new Response",
    kind: vscode.CompletionItemKind.Constructor,
    detail: "new Response(body?, init?)",
    documentation: "Create a raw Response.",
    insertText: new vscode.SnippetString("new Response(${1:body}, { status: ${2:200}, headers: { 'content-type': 'text/html' } })"),
    sortPriority: "7",
  },
  {
    label: "request.json",
    kind: vscode.CompletionItemKind.Function,
    detail: "await request.json()",
    documentation: "Parse request body as JSON.",
    insertText: new vscode.SnippetString("await request.json()"),
    sortPriority: "7",
  },
  {
    label: "request.formData",
    kind: vscode.CompletionItemKind.Function,
    detail: "await request.formData()",
    documentation: "Parse request body as FormData.",
    insertText: new vscode.SnippetString("await request.formData()"),
    sortPriority: "7",
  },
  {
    label: "request.text",
    kind: vscode.CompletionItemKind.Function,
    detail: "await request.text()",
    documentation: "Parse request body as text.",
    insertText: new vscode.SnippetString("await request.text()"),
    sortPriority: "7",
  },
  {
    label: "request.headers",
    kind: vscode.CompletionItemKind.Property,
    detail: "request.headers",
    documentation: "Request Headers object.\n\n```typescript\nconst auth = request.headers.get('authorization');\nconst cookie = request.headers.get('cookie');\nconst contentType = request.headers.get('content-type');\n```",
    insertText: new vscode.SnippetString("request.headers.get('${1:header-name}')"),
    sortPriority: "7",
  },
  {
    label: "request.url",
    kind: vscode.CompletionItemKind.Property,
    detail: "request.url",
    documentation: "Request URL string.",
    insertText: new vscode.SnippetString("request.url"),
    sortPriority: "7",
  },
  {
    label: "request.method",
    kind: vscode.CompletionItemKind.Property,
    detail: "request.method",
    documentation: "HTTP method: GET, POST, PUT, PATCH, DELETE.",
    insertText: new vscode.SnippetString("request.method"),
    sortPriority: "7",
  },
];

export class FlyScriptCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] {
    const textBefore = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    );

    if (!this.isInsideScriptBlock(textBefore)) return [];

    const items: vscode.CompletionItem[] = [];

    for (const item of FLY_SCRIPT_ITEMS) {
      const completionItem = new vscode.CompletionItem(item.label, item.kind);
      completionItem.detail = item.detail;
      completionItem.documentation = new vscode.MarkdownString(item.documentation);
      completionItem.insertText = item.insertText;
      completionItem.sortText = (item.sortPriority || "9") + item.label;

      if (item.kind === vscode.CompletionItemKind.Keyword) {
        completionItem.preselect = true;
      }

      items.push(completionItem);
    }

    const stateVars = this.extractStateVars(textBefore);
    for (const varName of stateVars) {
      const completionItem = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
      completionItem.detail = "Reactive state variable ($state)";
      completionItem.documentation = new vscode.MarkdownString(
        `Reactive variable \`${varName}\`. Updates automatically in the template.\n\nAccess: \`{${varName}}\` in template, or \`{${varName}.property}\` for objects.`
      );
      completionItem.sortText = "8_" + varName;
      items.push(completionItem);

      const dotItem = new vscode.CompletionItem(varName + ".", vscode.CompletionItemKind.Variable);
      dotItem.detail = `Property access on ${varName}`;
      dotItem.insertText = new vscode.SnippetString(`${varName}.\${1:property}`);
      dotItem.sortText = "8_" + varName + "_dot";
      items.push(dotItem);
    }

    const exportedFns = this.extractExportedFunctions(textBefore);
    for (const fnName of exportedFns) {
      const completionItem = new vscode.CompletionItem(fnName, vscode.CompletionItemKind.Function);
      completionItem.detail = "Exported function";
      completionItem.documentation = new vscode.MarkdownString(`Call exported function \`${fnName}()\`.`);
      completionItem.sortText = "9_" + fnName;
      items.push(completionItem);
    }

    const loaderParams = this.extractLoaderParams(textBefore);
    for (const param of loaderParams) {
      const completionItem = new vscode.CompletionItem(param, vscode.CompletionItemKind.Variable);
      completionItem.detail = "Loader context parameter";
      completionItem.sortText = "8_" + param;
      items.push(completionItem);
    }

    const apiParams = this.extractApiParams(textBefore);
    for (const param of apiParams) {
      const completionItem = new vscode.CompletionItem(param, vscode.CompletionItemKind.Variable);
      completionItem.detail = "API handler context parameter";
      completionItem.sortText = "8_" + param;
      items.push(completionItem);
    }

    return items;
  }

  private isInsideScriptBlock(text: string): boolean {
    const lastScriptOpen = text.lastIndexOf("<script");
    if (lastScriptOpen === -1) return false;
    const lastScriptClose = text.lastIndexOf("</script>");
    return lastScriptOpen > lastScriptClose;
  }

  private extractStateVars(text: string): string[] {
    const vars: string[] = [];
    const regex = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\$state\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      vars.push(match[1]);
    }
    return vars;
  }

  private extractExportedFunctions(text: string): string[] {
    const fns: string[] = [];
    const regex = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      fns.push(match[1]);
    }
    return fns;
  }

  private extractLoaderParams(text: string): string[] {
    const params: string[] = [];
    const match = text.match(/export\s+(?:async\s+)?function\s+loader\s*\(\s*\{([^}]*)\}/);
    if (match) {
      for (const p of match[1].split(",")) {
        const clean = p.trim().replace(/[:=].*$/, "").trim();
        if (clean) params.push(clean);
      }
    }
    return params;
  }

  private extractApiParams(text: string): string[] {
    const params: string[] = [];
    const match = text.match(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*\{([^}]*)\}/);
    if (match) {
      for (const p of match[2].split(",")) {
        const clean = p.trim().replace(/[:=].*$/, "").trim();
        if (clean) params.push(clean);
      }
    }
    return params;
  }
}
