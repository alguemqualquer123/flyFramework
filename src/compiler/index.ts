// Entrypoint do compilador: recebe fonte .fly e devolve artefatos prontos.
import { readFileSync } from "node:fs";
import { parseTemplate, type Node } from "./parser.ts";
import { analyzeScript, type Analyzed } from "./analyzer.ts";
import { generateServer, generateClient, generateActionClient, actionId } from "./codegen.ts";
import { applyAstPlugins, applyClientPlugins, applySourcePlugins } from "./plugins.ts";
import { escapeHtml, escapeAttr } from "../runtime/server.ts";
import { makeFlyUtils, FlyRedirect, FlyNotFound } from "../core/utils.ts";
import { hashFile } from "../core/css.ts";

export type ServerOut = {
  html: string;
  data: any;
  meta: ((ctx: any) => any) | null;
  api: Record<string, (ctx: any) => Promise<any> | any>;
  actions: Record<string, (ctx: any) => Promise<any> | any>;
};

export type Compiled = {
  render: (ctx: SsrCtx) => Promise<ServerOut>;
  clientCode: string;
  isActionModule: boolean;
  config: Analyzed["config"];
  analyzed: Analyzed;
  style: string;
  scope?: string;
  generateStaticParams?: () => Promise<string[]> | string[];
};

export type SsrCtx = {
  params?: Record<string, string>;
  request?: Request;
  url?: URL;
  cache?: any;
  slotContent?: string;
  slots?: Record<string, string>;
  data?: any;
  env?: Record<string, string>;
  flyUtils?: ReturnType<typeof makeFlyUtils>;
};

export function extractSections(source: string): { script: string; style: string; template: string } {
  const dirMatch = /^["']use\s+(client|server)["']\s*;?\s*/.exec(source);
  if (dirMatch) {
    // Módulo de diretiva no topo do arquivo (ex.: "use server"): todo o conteúdo é script.
    return { script: source.trim(), style: "", template: "" };
  }
  const scriptMatch = /<script>([\s\S]*?)<\/script>/.exec(source);
  const styleMatch = /<style>([\s\S]*?)<\/style>/.exec(source);
  const script = scriptMatch ? scriptMatch[1] : "";
  const style = styleMatch ? styleMatch[1] : "";
  let rest = source;
  if (scriptMatch) rest = rest.replace(scriptMatch[0], "");
  if (styleMatch) rest = rest.replace(styleMatch[0], "");
  const template = rest.trim();
  return { script, style, template };
}

// Env público usado para inlining no client (definido em runtime pela pipeline).
let compPublicEnv: Record<string, string> = {};
export function setCompileEnv(env: Record<string, string>) {
  compPublicEnv = env ?? {};
}

export function compile(source: string, opts: { file?: string; publicEnv?: Record<string, string> } = {}): Compiled {
  const { script, style, template } = extractSections(applySourcePlugins(source));
  let ast: Node[] = parseTemplate(template);
  const analyzed = analyzeScript(script);
  const file = opts.file ?? "unknown";
  const publicEnv = opts.publicEnv ?? compPublicEnv;
  const scope = style && style.trim() ? hashFile(file) : "";

  // Aplica plugins (AST hook)
  ast = applyAstPlugins(ast);

  const ssrBody = generateServer(ast, analyzed, script.replace(/export\s+/g, ""), scope);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as any;
  const render = (ctx: SsrCtx): Promise<ServerOut> => {
    const fn = new AsyncFunction("ctx", "escapeHtml", "escapeAttr", ssrBody) as (c: SsrCtx) => Promise<ServerOut>;
    return fn(ctx, escapeHtml, escapeAttr);
  };

  let clientCode: string;
  const actionIds: Record<string, string> = {};
  const actionFns: Record<string, any> = {};

  if (analyzed.directive === "server") {
    for (const [name, src] of Object.entries(analyzed.actions)) {
      const id = actionId(file, name);
      actionIds[name] = id;
      const factory = new Function(
        "args",
        "request",
        "cache",
        "revalidateTag",
        "revalidatePath",
        "redirect",
        "notFound",
        "return (" + src.replace("export ", "") + ")(...args)"
      ) as any;
      actionFns[id] = (args: any[], request: Request) => {
        const u = makeFlyUtils({ request });
        return factory(args, request, globalFlyCache, u.revalidateTag, u.revalidatePath, u.redirect, u.notFound);
      };
    }
    clientCode = applyClientPlugins(generateActionClient(actionIds), analyzed);
  } else {
    clientCode = applyClientPlugins(generateClient(ast, analyzed, publicEnv, scope), analyzed);
  }

  const compiled: Compiled = {
    render,
    clientCode,
    isActionModule: analyzed.directive === "server",
    config: analyzed.config,
    analyzed,
    style,
    scope,
  };
  if (analyzed.generateStaticParams) {
    const factory = new Function("return (" + analyzed.generateStaticParams.replace("export ", "") + ");")() as any;
    compiled.generateStaticParams = () => factory();
  }
  (compiled as any).__actionFns = actionFns;
  (compiled as any).__actionIds = actionIds;
  return compiled;
}

// cache global (mesma instância do módulo) para actions
import { dataCache, routeCache } from "../cache/revalidate.ts";
const globalFlyCache = dataCache;

export { FlyRedirect, FlyNotFound, makeFlyUtils };

// Registry global de server actions (id -> fn), populado em getCompiled.
export const actionRegistry = new Map<string, (args: any[], request: Request) => Promise<any>>();

const compiledCache = new Map<string, Compiled>();
export function getCompiled(file: string): Compiled {
  let c = compiledCache.get(file);
  if (!c) {
    const src = readFileSync(file, "utf8");
    c = compile(src, { file });
    compiledCache.set(file, c);
    if (c.isActionModule) {
      const ids = (c as any).__actionIds as Record<string, string>;
      for (const [name, id] of Object.entries(ids)) {
        actionRegistry.set(id, (c as any).__actionFns[id]);
        actionRegistry.set(name, (c as any).__actionFns[id]);
      }
    }
  }
  return c;
}
