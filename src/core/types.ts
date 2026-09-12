// Gerador de tipos end-to-end: produz um fly.d.ts com tipagem dos contratos do app
// (rotas -> params, ações servidoras, metas SEO) importável pelo usuário.
import type { ScanResult } from "../router/scanner.ts";
import { hashFile } from "./css.ts";

// Infere o tipo de um mapa de params a partir de uma rota com placeholders [x]/:x/catch-all.
export function paramsTypeOf(route: string): string {
  const names: string[] = [];
  for (const m of route.matchAll(/(?:\[([\w-]+)\]|:(\w+)(?:\*)?|\.\.\.([\w-]+))/g)) {
    const n = m[1] ?? m[2] ?? m[3];
    if (n && !names.includes(n)) names.push(n);
  }
  if (names.length === 0) return "Record<string, string>";
  return `{ ${names.map((n) => `${JSON.stringify(n)}: string`).join("; ")} }`;
}

// Emite a declaração de tipos de um escaneamento do app.
export function generateRouteTypes(scan: ScanResult): string {
  const routeEntries = scan.pages
    .map((p) => `    ${JSON.stringify(p.route)}: ${paramsTypeOf(p.route)};`)
    .join("\n");
  const apiEntries = scan.apis
    .map((a) => `    ${JSON.stringify(a.route)}: { params: ${paramsTypeOf(a.route)}; methods: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" };`)
    .join("\n");
  const actionEntries = scan.actionFiles
    .map((f) => `    ${JSON.stringify(f)}: string[];`)
    .join("\n");

  return `// Gerado por Fly — não edite manualmente.
import type { FlyParams } from "../src/types.d.ts";

// Parâmetros de rota por página (.fly)
export interface FlyPageParams {
${routeEntries}
}

// Contrato das rotas de API
export interface FlyApiRoutes {
${apiEntries}
}

// Arquivos de server actions (nomes de ações exportados)
export interface FlyActionFiles {
${actionEntries}
}

// Tipos de utilitários globais disponíveis em qualquer arquivo .fly/script
export type FlyPageLoader<T = unknown> = import("../src/types.d.ts").Loader<T>;
export type FlyServerAction<A extends unknown[] = any[], R = unknown> = import("../src/types.d.ts").ServerAction<A, R>;
export { };`;
}

// Concatena os tipos utilitários (inline) mais os tipos das rotas do app em um único .d.ts.
export function generateTypes(scan: ScanResult, opts: { importBase?: string } = {}): string {
  const base = opts.importBase ?? ".";
  return `// Gerado por Fly — declareTypes gerado automaticamente no build.
// Tipos utilitários do core
import type { Loader, ServerAction, FlyMeta, FlyContext, FlyParams, LinkProps, ImageProps, FormProps } from ${JSON.stringify(base + "/src/types.d.ts")};

${generateRouteTypes(scan)}

declare module "fly" {
  export type { Loader, ServerAction, FlyMeta, FlyContext, FlyParams, LinkProps, ImageProps, FormProps };
  export interface PageParams extends FlyPageParams {}
  export interface ApiRoutes extends FlyApiRoutes {}
  export interface ActionFiles extends FlyActionFiles {}
}
`;
}

// Exportado para testes: validar o gerador sem app real.
export { hashFile };
