// Tipos utilitários do framework Fly, importáveis pelo usuário (ex.):
//   import type { Loader, ServerAction, FlyMeta } from "./src/types.d.ts";
// Nota: imports de .d.ts em NodeNext usam runtime, mas estes tipos também são
// expostos como um módulo em src/core/utils.ts se precisar de valores.

export type FlyParams = Record<string, string>;

export interface FlyContext {
  params: FlyParams;
  request: Request;
  url: URL;
  cache: unknown;
  env: Record<string, string>;
  locale?: string;
  t?: (key: string, vars?: Record<string, string | number>) => string;
}

export type Loader<T = unknown> = (ctx: FlyContext) => T | Promise<T>;

export type ServerAction<Args extends unknown[] = any[], R = unknown> = (
  ...args: Args
) => Promise<R> | R;

export interface FlyMeta {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  robots?: string;
}

export interface FlySlotProps {
  children?: unknown;
}

// Props dos componentes embutidos (Link, Image, Form)
export interface LinkProps extends FlySlotProps {
  href: string;
  [key: string]: unknown;
}
export interface ImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  [key: string]: unknown;
}
export interface FormProps {
  action?: unknown;
  actionUrl?: string;
  url?: string;
  method?: string;
  [key: string]: unknown;
}

// Componente genérico .fly (props + slots)
export type FlyComponent<
  P extends Record<string, unknown> = Record<string, unknown>,
> = (props: P & FlySlotProps) => unknown;

// Helpers injetados no SSR (server-only) — veja src/core/utils.ts
export interface FlyServerHelpers {
  redirect(url: string, status?: number): never;
  notFound(): never;
  cookies(): Record<string, string>;
  headers(): Record<string, string>;
}
