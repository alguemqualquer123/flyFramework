// Sistema de plugins do compilador: permite transformar o source, a AST e o client code
// em tempo de build. Plugins são registrados globalmente e aplicados em cada compile().
import type { Node } from "./parser.ts";
import type { Analyzed } from "./analyzer.ts";

export type FlyPlugin = {
  name: string;
  /** Transformação do source bruto antes do parse (ex.: macros, aliases). */
  transformSource?: (source: string) => string;
  /** Hook sobre a AST já parseada (pode modificar/estender nós). */
  onAst?: (ast: Node[]) => Node[];
  /** Hook sobre o client code gerado (pode prefixar imports/helpers). */
  onClientCode?: (code: string, analyzed: Analyzed) => string;
};

const plugins: FlyPlugin[] = [];

export function registerPlugin(p: FlyPlugin): void {
  if (!plugins.find((x) => x.name === p.name)) plugins.push(p);
}

export function getPlugins(): FlyPlugin[] {
  return plugins;
}

export function applySourcePlugins(source: string): string {
  let s = source;
  for (const p of plugins) if (p.transformSource) s = p.transformSource(s);
  return s;
}

export function applyAstPlugins(ast: Node[]): Node[] {
  let a = ast;
  for (const p of plugins) if (p.onAst) a = p.onAst(a);
  return a;
}

export function applyClientPlugins(code: string, analyzed: Analyzed): string {
  let c = code;
  for (const p of plugins) if (p.onClientCode) c = p.onClientCode(c, analyzed);
  return c;
}
