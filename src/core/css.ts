// Pipeline CSS próprio (zero-dependência): estilos escopados por componente,
// utilitárias Tailwind-like e variantes responsivas por breakpoint.
import type { ScanResult } from "../router/scanner.ts";

let seed = 0;
const fileHashCache = new Map<string, string>();

// Hash estável e curto a partir do caminho do arquivo (usado como scope).
export function hashFile(path: string): string {
  if (fileHashCache.has(path)) return fileHashCache.get(path)!;
  let h = 5381;
  for (const ch of path) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  const hash = (h >>> 0).toString(16).padStart(8, "0").slice(0, 8);
  fileHashCache.set(path, hash);
  return hash;
}

export function scopeAttr(path: string): string {
  return `data-fly-scope="${hashFile(path)}"`;
}

// Prefixa o(s) seletor(es) de cada regra com o atributo de escopo. Regras dentro
// de @media/@supports são escopadas recursivamente; @keyframes são preservadas.
export function scopeCss(css: string, path: string): string {
  const scope = `[data-fly-scope="${hashFile(path)}"]`;
  return scopeRules(css, scope);
}

function scopeRules(css: string, scope: string): string {
  const out: string[] = [];
  let i = 0;
  let buffer = "";
  let pendingAtHeader = "";
  let inMedia = false;

  // Divide o CSS em "tokens" de regras no nível raiz tracking de chaves.
  // Estratégia: processar caractere a caractere; quando encontramos uma regra
  // (seletor { ... }) ou at-rule (@media { ... }), escopamos ou recursamos.
  while (i < css.length) {
    const c = css[i];
    if (c === "{") {
      const head = (buffer + c).replace(/[\r\n]+/g, " ").trim();
      if (/@media|@supports|@container/i.test(head)) {
        const close = findMatching(css, i);
        const inner = css.slice(i + 1, close);
        out.push(`${head}${scopeRules(inner, scope)}}`);
        i = close;
        buffer = "";
      } else if (/@keyframes/i.test(head)) {
        const close = findMatching(css, i);
        out.push(head + css.slice(i + 1, close + 1));
        i = close;
        buffer = "";
      } else {
        const close = findMatching(css, i);
        const sel = head.slice(0, -1).trim();
        const body = css.slice(i + 1, close);
        out.push(`${scope} ${sel} {${body}}`);
        i = close;
        buffer = "";
      }
    } else {
      buffer += c;
    }
    i++;
  }
  return out.join("\n");
}

function findMatching(css: string, openBrace: number): number {
  let depth = 0;
  for (let j = openBrace; j < css.length; j++) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return css.length - 1;
}

// Breakpoints padrão (largura mínima).
export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
export type Breakpoint = keyof typeof breakpoints;

// Utilitárias core (sem variante) + responsivas (sm:/md:/lg:/xl:) — Tailwind-like.
export function generateUtilities(
  bps: Partial<Record<Breakpoint, number>> = breakpoints,
): string {
  const lines: string[] = [];
  const add = (sel: string, decl: string) => lines.push(`.${sel}{${decl}}`);

  // display
  for (const d of ["block", "inline-block", "flex", "grid", "hidden"])
    add(d, `display:${d}`);
  add("flex-col", "flex-direction:column");
  add("flex-row", "flex-direction:row");
  for (const it of ["start", "center", "end", "between"])
    add(
      `items-${it}`,
      `align-items:${it === "between" ? "baseline" : it}` ===
        "align-items:baseline"
        ? "align-items:flex-start"
        : `align-items:${it}`,
    );
  add("items-center", "align-items:center");
  for (const j of ["start", "center", "end", "between"])
    add(
      `justify-${j}`,
      j === "between"
        ? "justify-content:space-between"
        : `justify-content:${j}`,
    );
  for (let n = 1; n <= 4; n++)
    add(`grid-cols-${n}`, `grid-template-columns:repeat(${n},minmax(0,1fr))`);
  add("flex-1", "flex:1");
  add("flex-wrap", "flex-wrap:wrap");

  // spacing (rem)
  const sp: Record<number, string> = {
    0: "0",
    1: ".25rem",
    2: ".5rem",
    3: ".75rem",
    4: "1rem",
    5: "1.5rem",
    6: "2rem",
    8: "3rem",
  };
  for (const [n, v] of Object.entries(sp)) {
    add(`p-${n}`, `padding:${v}`);
    add(`px-${n}`, `padding-left:${v};padding-right:${v}`);
    add(`py-${n}`, `padding-top:${v};padding-bottom:${v}`);
    add(`m-${n}`, `margin:${v}`);
    add(`mx-${n}`, `margin-left:${v};margin-right:${v}`);
    add(`my-${n}`, `margin-top:${v};margin-bottom:${v}`);
    add(`gap-${n}`, `gap:${v}`);
    add(`gap-x-${n}`, `column-gap:${v}`);
    add(`gap-y-${n}`, `row-gap:${v}`);
  }

  // largura / texto
  add("w-full", "width:100%");
  add("w-auto", "width:auto");
  add("max-w-full", "max-width:100%");
  for (const t of ["left", "center", "right"])
    add(`text-${t}`, `text-align:${t}`);
  const sizes: Record<string, string> = {
    xs: ".75rem",
    sm: ".875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  };
  for (const [n, v] of Object.entries(sizes))
    add(`text-${n}`, `font-size:${v}`);
  for (const w of [400, 500, 600, 700]) add(`font-${w}`, `font-weight:${w}`);
  add("rounded", "border-radius:.25rem");
  add("rounded-lg", "border-radius:.5rem");
  add("shadow", "box-shadow:0 1px 3px rgba(0,0,0,.12)");

  // responsivas: repete compacto (display + flex + grid + spacing essencial)
  for (const [name, px] of Object.entries(bps)) {
    lines.push(`@media (min-width:${px}px){`);
    for (const d of ["block", "flex", "grid", "hidden"])
      add(`${name}:${d}`, `display:${d}`);
    add(`${name}:flex-col`, "flex-direction:column");
    add(`${name}:flex-row`, "flex-direction:row");
    add(`${name}:items-center`, "align-items:center");
    add(`${name}:justify-center`, "justify-content:center");
    add(`${name}:justify-between`, "justify-content:space-between");
    for (let n = 2; n <= 4; n++)
      add(
        `${name}:grid-cols-${n}`,
        `grid-template-columns:repeat(${n},minmax(0,1fr))`,
      );
    for (const [n, v] of Object.entries(sp)) {
      add(`${name}:p-${n}`, `padding:${v}`);
      add(`${name}:m-${n}`, `margin:${v}`);
      add(`${name}:gap-${n}`, `gap:${v}`);
    }
    for (const t of ["left", "center", "right"])
      add(`${name}:text-${t}`, `text-align:${t}`);
    for (const [sn, sv] of Object.entries(sizes))
      add(`${name}:text-${sn}`, `font-size:${sv}`);
    add(`${name}:w-full`, "width:100%");
    lines.push("}");
  }

  return lines.join("");
}

// Coleta o CSS global: utilitárias + estilos escopados de cada componente.
export function collectStyles(
  scan: ScanResult,
  componentCss: (file: string) => string,
  enableUtilities = true,
): string {
  const parts: string[] = [];
  if (enableUtilities) parts.push(generateUtilities());
  for (const entry of [...scan.pages, ...scan.apis, ...scan.layouts]) {
    const css = componentCss(entry.file);
    if (css && css.trim()) parts.push(scopeCss(css, entry.file));
  }
  return parts.join("\n");
}
