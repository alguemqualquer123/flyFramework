// Codegen: gera (1) função SSR que retorna HTML e (2) código client reativo.
import type { Node, Attr } from "./parser.ts";
import type { Analyzed } from "./analyzer.ts";

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

// Componentes embutidos (sem Virtual DOM): Link -> <a data-fly-link>, Image -> <img loading=lazy>
function resolveComp(tag: string, attrs: Attr[]): { tag: string; attrs: Attr[] } {
  if (tag === "Link") {
    return { tag: "a", attrs: [{ name: "data-fly-link", value: "", dynamic: false }, ...attrs] };
  }
  if (tag === "Image") {
    return {
      tag: "img",
      attrs: [...attrs, { name: "loading", value: "lazy", dynamic: false }, { name: "decoding", value: "async", dynamic: false }],
    };
  }
  if (tag === "Form") {
    // Formulários progressivos: funciona sem JS (POST nativo) e é interceptado no client
    // (data-fly-form) para fazer a chamada à server action via XHR/SPA.
    const outAttrs: Attr[] = [{ name: "data-fly-form", value: "true", dynamic: false }];
    for (const a of attrs) {
      if (a.name === "action") {
        // O valor pode ser {nomeDaAction}. Usamos o texto da expressão como id/nome
        // estático (não avaliamos a função no SSR); o client resolve via __FLY_ACTION_IDS__.
        const val = a.value.includes("{") ? a.value.replace(/[{}]/g, "").trim() : a.value;
        outAttrs.push({ name: "data-fly-action", value: val, dynamic: false });
      } else if (a.name === "actionUrl" || a.name === "url") {
        outAttrs.push({ name: "action", value: a.value, dynamic: a.dynamic });
      } else {
        outAttrs.push(a);
      }
    }
    return { tag: "form", attrs: outAttrs };
  }
  return { tag, attrs };
}

// ---------- reescrita de sinais ----------
function rw(code: string, state: string[], derived: string[]): string {
  for (const S of state) {
    code = code.replace(new RegExp(`\\b${S}\\+\\+`, "g"), `${S}.set(${S}.get()+1)`);
    code = code.replace(new RegExp(`\\b${S}--`, "g"), `${S}.set(${S}.get()-1)`);
    code = code.replace(new RegExp(`\\b${S}\\+=([^;\\n]+)`, "g"), (_m, p1) => `${S}.set(${S}.get()+(${p1.trim()}))`);
    code = code.replace(new RegExp(`\\b${S}\\-=([^;\\n]+)`, "g"), (_m, p1) => `${S}.set(${S}.get()-(${p1.trim()}))`);
    code = code.replace(new RegExp(`\\b${S}\\s*=\\s*(?!\\s*signal\\()([^=][^;\\n]*?)(?=[,;\\n]|$)`, "g"), (_m, p1) => `${S}.set(${p1})`);
  }
  const all = [...state, ...derived];
  for (const S of all) {
    code = code.replace(new RegExp(`(?<![\\w.])\\b${S}\\b(?!\\.)(?!\\s*=)`, "g"), `${S}.get()`);
  }
  return code;
}

function serverStateTransform(script: string): string {
  // $state(x) -> signal(x)  e  $derived(expr) -> derived(expr)
  // No server, signal/derived são stubs com .get(), e as leituras viram .get() via rwReads.
  return script
    .replace(/\$state\(/g, "signal(")
    .replace(/\$derived\(/g, "derived(");
}

// apenas leituras (sem reescrita de atribuição) — usado no SSR
function rwReads(code: string, names: string[]): string {
  for (const S of names) {
    code = code.replace(new RegExp(`(?<![\\w.])\\b${S}\\b(?!\\.)(?!\\s*=)`, "g"), `${S}.get()`);
  }
  return code;
}

let _ssrNames: string[] = [];
let _scope = "";

// Atributo de escopo para estilos (vazio quando o componente não tem <style>).
function scopeSrvAttr(): string {
  if (!_scope) return "";
  return ` data-fly-scope="${_scope}"`;
}
function scopeCliAttr(): string {
  if (!_scope) return "";
  return `${JSON.stringify("data-fly-scope")}: ${JSON.stringify(_scope)}`;
}

// ---------- SERVER ----------
function srvSegments(segs: { kind: string; value: string }[]): string {
  let code = "";
  for (const s of segs) {
    if (s.kind === "text") code += `__html += ${JSON.stringify(s.value)};\n`;
    else code += `__html += escapeHtml(${rwReads(s.value, _ssrNames)});\n`;
  }
  return code;
}

function srvAttrValue(name: string, value: string): string {
  if (!value.includes("{")) return `' ${name}="${value.replace(/"/g, "&quot;")}"'`;
  const parts = splitDynamic(value);
  let code = `' ${name}="'`;
  for (const p of parts) {
    if (p.kind === "text") code += ` + ${JSON.stringify(p.value)}`;
    else code += ` + escapeAttr(${rwReads(p.value, _ssrNames)})`;
  }
  code += ` + '"'`;
  return code;
}

function splitDynamic(value: string): { kind: string; value: string }[] {
  return require_split(value);
}

function srvNodes(nodes: Node[]): string {
  let code = "";
  for (const n of nodes) {
    if (n.type === "text") code += srvSegments(n.segments);
    else if (n.type === "slot") {
      if (n.name) code += `__html += ((slots && slots[${JSON.stringify(n.name)}]) ?? "");\n`;
      else code += `__html += (slotContent ?? "");\n`;
    }
    else if (n.type === "suspense") {
      // Suspense: no SSR o conteúdo real já está pronto; renderiza os children direto.
      code += srvNodes(n.children);
    } else if (n.type === "if") {
      const el: Node = { type: "element", tag: n.tag, attrs: n.attrs, children: n.children };
      code += `if (${n.test}) {\n${srvNodes([el])}}\n`;
    } else if (n.type === "for") {
      const iter = n.index ? `[${n.item}, ${n.index}] of (${n.of}).entries()` : `${n.item} of (${n.of})`;
      const el: Node = { type: "element", tag: n.tag, attrs: n.attrs, children: n.children };
      code += `for (const ${iter}) {\n${srvNodes([el])}}\n`;
    } else if (n.type === "element") {
      const { tag: rTag, attrs: rAttrs } = resolveComp(n.tag, n.attrs);
      if (n.island) {
        // Partial hydration: o conteúdo é renderizado dentro de um <template> marcado.
        // O client substitui o template pelo conteúdo reativo quando o gatilho dispara.
        code += `__html += '<template data-fly-island="${n.island}" data-fly-isl="${n.islandId}" style="display:none">';\n`;
        code += srvNodes(n.children);
        code += `__html += '</template>';\n`;
        continue;
      }
      code += `__html += "<" + ${JSON.stringify(rTag)};\n`;
      if (_scope) code += `__html += ' data-fly-scope="${_scope}"';\n`;
      for (const a of rAttrs) code += srvAttr(a);
      code += `__html += ">";\n`;
      if (!VOID.has(rTag)) {
        code += srvNodes(n.children);
        code += `__html += "</" + ${JSON.stringify(rTag)} + ">";\n`;
      }
    }
  }
  return code;
}

function srvAttr(a: Attr): string {
  if (a.name.startsWith("on:") || a.name.startsWith("transition:")) return "";
  if (a.name === "bind:value") {
    const expr = a.value.replace(/[{}]/g, "").trim();
    return `__html += ' value="' + escapeAttr(${expr}) + '"';\n`;
  }
  if (a.name.startsWith("class:")) {
    const mod = a.name.slice(6);
    const expr = a.value.replace(/[{}]/g, "").trim();
    return `__html += (${expr} ? ' class="${mod}"' : '');\n`;
  }
  if (a.name.startsWith("style:")) {
    const prop = a.name.slice(6);
    const expr = a.value.replace(/[{}]/g, "").trim();
    return `__html += ' style="${prop}:' + escapeAttr(${expr}) + '"';\n`;
  }
  return `__html += ${srvAttrValue(a.name, a.value)};\n`;
}

export function generateServer(ast: Node[], analyzed: Analyzed, serverScript: string, scope = ""): string {
  _ssrNames = [...analyzed.stateVars, ...analyzed.derivedVars, ...analyzed.storeVars];
  _scope = scope;
  const script = rwReads(serverStateTransform(serverScript), _ssrNames);
  const body =
    `const { params, request, slotContent, slots, cache, url } = ctx;\n` +
    `const { redirect, notFound, cookies, headers, revalidateTag, revalidatePath } = ctx;\n` +
    `const import_meta = { env: (ctx && ctx.env) ? ctx.env : {} };\n` +
    `const signal = (v) => ({ get: () => v, set() {}, peek: () => v });\n` +
    `const effect = () => {};\n` +
    `const derived = (fn) => ({ get: fn, peek: fn });\n` +
    `const writable = (v) => ({ get: () => v, set() {}, peek: () => v, subscribe: () => {}, update() {} });\n` +
    `const readable = (v) => ({ get: () => v, set() {}, peek: () => v, subscribe: () => {} });\n` +
    `const onMount = () => {}; const onDestroy = () => {}; const get = (s) => (s && s.get ? s.get() : s); const tick = () => Promise.resolve();\n` +
    script + "\n" +
    `let data = {};\n` +
    `if (typeof loader !== "undefined") { data = await loader({ params, request, cache, url }); }\n` +
    `let __html = "";\n` +
    srvNodes(ast) +
    `return { html: __html, data, meta: (typeof meta !== "undefined" ? meta : null), middleware: (typeof middleware !== "undefined" ? middleware : null), api: {\n` +
    `  GET: (typeof GET !== "undefined" ? GET : undefined),\n` +
    `  POST: (typeof POST !== "undefined" ? POST : undefined),\n` +
    `  PUT: (typeof PUT !== "undefined" ? PUT : undefined),\n` +
    `  PATCH: (typeof PATCH !== "undefined" ? PATCH : undefined),\n` +
    `  DELETE: (typeof DELETE !== "undefined" ? DELETE : undefined)\n` +
    `} };\n`;
  return body.replace(/import\.meta\.env/g, "import_meta.env");
}

// ---------- CLIENT ----------
function cliSegments(segs: { kind: string; value: string }[], state: string[], derived: string[]): string[] {
  const out: string[] = [];
  let buf = "";
  const flush = () => { if (buf) { out.push(JSON.stringify(buf)); buf = ""; } };
  for (const s of segs) {
    if (s.kind === "text") buf += s.value;
    else { flush(); out.push(`text(() => ${rw(s.value, state, derived)})`); }
  }
  flush();
  return out;
}

function cliAttrValue(value: string, state: string[], derived: string[]): string {
  const parts = require_split(value);
  return parts.map((p) => (p.kind === "text" ? JSON.stringify(p.value) : `String(${rw(p.value, state, derived)})`)).join(" + ");
}

function cliNodes(nodes: Node[], state: string[], derived: string[]): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    if (n.type === "text") out.push(...cliSegments(n.segments, state, derived));
    else if (n.type === "slot") {
      if (n.name) out.push(`(slots && slots[${JSON.stringify(n.name)}]) ?? ""`);
      else out.push("slotContent");
    }
    else if (n.type === "suspense") {
      const kids = cliNodes(n.children, state, derived);
      out.push(`mountSuspense(() => [${kids.join(", ")}])`);
    } else if (n.type === "if") {
      const el: Node = { type: "element", tag: n.tag, attrs: n.attrs, children: n.children };
      out.push(`hIf(() => (${rw(n.test, state, derived)}), () => [${cliElement(el, state, derived)}])`);
    } else if (n.type === "for") {
      const args = n.index ? `[${n.item}, ${n.index}]` : n.item;
      const el: Node = { type: "element", tag: n.tag, attrs: n.attrs, children: n.children };
      out.push(`hFor(() => (${rw(n.of, state, derived)}), (${args}) => [${cliElement(el, state, derived)}])`);
    } else if (n.type === "element") out.push(cliElement(n, state, derived));
  }
  return out;
}

function cliElement(n: Extract<Node, { type: "element" }>, state: string[], derived: string[]): string {
  const { tag: rTag, attrs: rAttrs } = resolveComp(n.tag, n.attrs);
  const props: string[] = [];
  const dyn: string[] = [];
  const ch = cliNodes(n.children, state, derived);
  for (const a of rAttrs) {
    if (a.name.startsWith("transition:")) {
      const type = a.name.slice(11) || "fade";
      dyn.push(`bindTransition(__el, ${JSON.stringify(type)});`);
    } else if (a.name.startsWith("on:")) {
      const evt = a.name.slice(3);
      const handler = a.value.replace(/[{}]/g, "").trim();
      dyn.push(`__el.addEventListener(${JSON.stringify(evt)}, () => { ${rw(handler, state, derived)} });`);
    } else if (a.name === "bind:value") {
      const sig = a.value.replace(/[{}]/g, "").trim();
      dyn.push(`bindValue(__el, ${sig});`);
    } else if (a.name.startsWith("class:")) {
      const mod = a.name.slice(6);
      const expr = a.value.replace(/[{}]/g, "").trim();
      dyn.push(`bindClass(__el, ${JSON.stringify(mod)}, () => ${rw(expr, state, derived)});`);
    } else if (a.name.startsWith("style:")) {
      const prop = a.name.slice(6);
      const expr = a.value.replace(/[{}]/g, "").trim();
      dyn.push(`bindStyle(__el, ${JSON.stringify(prop)}, () => ${rw(expr, state, derived)});`);
    } else if (a.dynamic) {
      props.push(`${JSON.stringify(a.name)}: ${cliAttrValue(a.value, state, derived)}`);
    } else {
      props.push(`${JSON.stringify(a.name)}: ${JSON.stringify(a.value)}`);
    }
  }
  if (_scope) props.push(`${JSON.stringify("data-fly-scope")}: ${JSON.stringify(_scope)}`);
  const propsStr = `{ ${props.join(", ")} }`;
  const childrenStr = ch.length ? `, ${ch.join(", ")}` : "";
  let code = `(() => { const __el = h(${JSON.stringify(rTag)}, ${propsStr}${childrenStr}); ${dyn.join(" ")} return __el; })()`;
  if (n.island) {
    // Partial hydration: adia a montagem até o gatilho (load/visible/idle) e substitui o
    // template SSR no mesmo ponto via âncora.
    code = `mountIsland(${n.islandId}, ${JSON.stringify(n.island)}, () => ${code})`;
  }
  return code;
}

export function actionId(file: string, name: string): string {
  return file.replace(/[^a-zA-Z0-9]/g, "_") + "_" + name;
}

export function generateActionClient(actionIds: Record<string, string>): string {
  const idMap = JSON.stringify(actionIds);
  let body =
    `globalThis.__FLY_ACTION_IDS__ = Object.assign(globalThis.__FLY_ACTION_IDS__ || {}, ${idMap});\n` +
    `globalThis.__flyActions = globalThis.__flyActions || {};\n` +
    `for (const [name, id] of Object.entries(${idMap})) {\n` +
    `  globalThis.__flyActions[name] = async (...args) => {\n` +
    `    const r = await fetch("/__fly/action/" + id, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(args) });\n` +
    `    if (!r.ok) throw new Error("action failed: " + r.status);\n` +
    `    const d = await r.json();\n` +
    `    if (d && d.__redirect) { location.href = d.__redirect; return; }\n` +
    `    if (d && d.__revalidate && d.__revalidate.length) d.__revalidate.forEach((t) => (globalThis.__flyRevalidate ? globalThis.__flyRevalidate(t) : location.reload()));\n` +
    `    return d ? d.result : undefined;\n` +
    `  };\n` +
    `}\n`;
  return body;
}

function inlineClientEnv(code: string, env: Record<string, string>): string {
  code = code.replace(/(?:(?:import\.meta\.env)|(?:process\.env))\.(PUBLIC_[A-Za-z0-9_]+)/g, (_m, k) => JSON.stringify(env[k] ?? ""));
  code = code.replace(/(?:(?:import\.meta\.env)|(?:process\.env))\.[A-Za-z0-9_]+/g, "undefined");
  return code;
}

export function generateClient(ast: Node[], analyzed: Analyzed, publicEnv: Record<string, string> = {}, scope = ""): string {
  _scope = scope;
  const state = [...analyzed.stateVars, ...analyzed.storeVars];
  const derived = analyzed.derivedVars;
  const script = analyzed.rawScript
    .replace(/\$state\(/g, "signal(")
    .replace(/\$derived\(/g, "derived(");
  const clientScript = rw(script, state, derived);
  const body = cliNodes(ast, state, derived).join(", ");
  const raw =
    `import { signal, effect, derived, h, text, hIf, hFor, bindClass, bindStyle, bindValue, bindTransition, mountRoot, mountIsland, mountSuspense, dispatchIslands, onMount, onDestroy, writable, readable, get, tick, moveItem, draggable, dropTarget, bindDragReorder } from "/__fly/client.js";\n` +
    `let data, params, request, props, slots;\n` +
    clientScript + "\n" +
    `function build() {\n  const __rootArr = [${body}];\n  const __frag = document.createDocumentFragment();\n  for (const __n of __rootArr) __frag.appendChild(__n);\n  return __frag;\n}\n` +
    `export function mount(target, ctxArg) {\n  data = ctxArg?.data; params = ctxArg?.params; request = ctxArg?.request; props = ctxArg?.props ?? {}; slots = ctxArg?.slots ?? {};\n  globalThis.__flyProps = props;\n  let slotContent = ctxArg?.html ?? "";\n  mountRoot(target, build);\n  dispatchIslands();\n}\n` +
    `globalThis.__flyMount = mount;\n`;
  return inlineClientEnv(raw, publicEnv);
}

// helper interno para split dinâmico (reutilizado por server e client)
function require_split(value: string): { kind: string; value: string }[] {
  const segs: { kind: string; value: string }[] = [];
  let i = 0, buf = "";
  while (i < value.length) {
    if (value[i] === "{") {
      let depth = 0, j = i, inStr: string | null = null;
      for (; j < value.length; j++) {
        const c = value[j];
        if (inStr) { if (c === inStr && value[j - 1] !== "\\") inStr = null; }
        else if (c === '"' || c === "'" || c === "`") inStr = c;
        else if (c === "{") depth++;
        else if (c === "}") { depth--; if (depth === 0) break; }
      }
      if (buf) { segs.push({ kind: "text", value: buf }); buf = ""; }
      segs.push({ kind: "expr", value: value.slice(i + 1, j).trim() });
      i = j + 1;
    } else { buf += value[i]; i++; }
  }
  if (buf) segs.push({ kind: "text", value: buf });
  return segs;
}
