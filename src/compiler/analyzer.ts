// Analyzer: extrai do <script> as declarações reativas, diretivas, loaders, ações e SSG.
export type Analyzed = {
  stateVars: string[];
  derivedVars: string[];
  storeVars: string[];
  rawScript: string;
  loader?: string;
  meta?: string;
  middleware?: string;
  api: Record<string, string>;
  actions: Record<string, string>;
  directive: "client" | "server" | null;
  generateStaticParams?: string;
  config: { render?: string; revalidate?: number; prerender?: boolean };
};

function findExported(script: string, name: string): string | null {
  const re = new RegExp("export\\s+(?:async\\s+)?function\\s+" + name + "\\s*");
  const m = re.exec(script);
  if (!m) return null;
  const p = script.indexOf("(", m.index);
  if (p === -1) return null;
  let depth = 0, j = p;
  for (; j < script.length; j++) {
    if (script[j] === "(") depth++;
    else if (script[j] === ")") { depth--; if (depth === 0) break; }
  }
  const open = script.indexOf("{", j);
  if (open === -1) return null;
  depth = 0;
  for (let k = open; k < script.length; k++) {
    if (script[k] === "{") depth++;
    else if (script[k] === "}") {
      depth--;
      if (depth === 0) return script.slice(m.index, k + 1);
    }
  }
  return null;
}

function findAllExportedFunctions(script: string): { name: string; src: string }[] {
  const out: { name: string; src: string }[] = [];
  const re = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script))) {
    const name = m[1];
    const src = findExported(script, name);
    if (src) out.push({ name, src });
  }
  return out;
}

export function analyzeScript(script: string): Analyzed {
  const stateVars: string[] = [];
  const derivedVars: string[] = [];
  const storeVars: string[] = [];
  const reState = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\$state\s*\(/g;
  const reDerived = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\$derived\s*\(/g;
  const reStore = /(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:writable|readable)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = reState.exec(script))) stateVars.push(m[1]);
  while ((m = reDerived.exec(script))) derivedVars.push(m[1]);
  while ((m = reStore.exec(script))) storeVars.push(m[1]);

  const directiveMatch = /^\s*["']use\s+(client|server)["']/.exec(script);
  const directive: "client" | "server" | null = directiveMatch ? (directiveMatch[1] as any) : null;

  const loader = findExported(script, "loader") ?? undefined;
  const meta = findExported(script, "meta") ?? undefined;
  const middleware = findExported(script, "middleware") ?? undefined;
  const generateStaticParams = findExported(script, "generateStaticParams") ?? undefined;

  const api: Record<string, string> = {};
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    const fn = findExported(script, method);
    if (fn) api[method] = fn;
  }

  const actions: Record<string, string> = {};
  if (directive === "server") {
    for (const { name, src } of findAllExportedFunctions(script)) {
      if (["loader", "meta", "generateStaticParams", "GET", "POST", "PUT", "PATCH", "DELETE"].includes(name)) continue;
      actions[name] = src;
    }
  }

  const config: Analyzed["config"] = {};
  const rm = /export\s+const\s+render\s*=\s*["']([^"']+)["']/.exec(script);
  if (rm) config.render = rm[1];
  const rv = /export\s+const\s+revalidate\s*=\s*(\d+)/.exec(script);
  if (rv) config.revalidate = Number(rv[1]);
  if (/export\s+const\s+prerender\s*=\s*true/.test(script)) config.prerender = true;

  // Remove exports server-only do script que vai pro client
  let raw = script;
  for (const ex of [loader, meta, ...Object.values(api), ...Object.values(actions)]) {
    if (ex) raw = raw.split(ex).join("");
  }
  raw = raw.replace(/export\s+const\s+render\s*=\s*["'][^"']+["'];?/g, "");
  raw = raw.replace(/export\s+const\s+revalidate\s*=\s*\d+;?/g, "");
  raw = raw.replace(/export\s+const\s+prerender\s*=\s*true;?/g, "");

  return { stateVars, derivedVars, storeVars, rawScript: raw, loader, meta, middleware, api, actions, directive, generateStaticParams, config };
}
