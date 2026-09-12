// Tailwind opcional via binário standalone (zero-dependência no core).
// Se `css.tailwind` estiver ligado e houver um binário do tailwind disponível,
// o CSS final usa o tailwind de verdade; senão cai pro pipeline interno
// (utilitárias + scoped) sem quebrar o build.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ScanResult } from "../router/scanner.ts";
import { collectStyles } from "./css.ts";

export type TailwindOpts = {
  binary?: string;
  input?: string;
  contentGlobs?: string[];
};

export function resolveTailwindBinary(explicit?: string): string | null {
  const candidates = [
    explicit,
    process.env.TAILWIND_BINARY,
    "node_modules/.bin/tailwindcss",
    "node_modules/tailwindcss/lib/cli.js",
    ".bin/tailwindcss",
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      if (existsSync(c as string)) return c as string;
    } catch {}
  }
  // tenta no PATH (which)
  try {
    const found = execFileSync("which", ["tailwindcss"], {
      encoding: "utf8",
    }).trim();
    if (found) return found;
  } catch {}
  return null;
}

export function tailwindAvailable(explicit?: string): boolean {
  return resolveTailwindBinary(explicit) !== null;
}

// Roda o binário standalone: tailwindcss -i input -o output --content "...".
// Retorna o CSS gerado ou null se falhar (caller faz fallback).
export function buildWithTailwind(opts: TailwindOpts = {}): string | null {
  const bin = resolveTailwindBinary(opts.binary);
  if (!bin) return null;
  const input =
    opts.input && existsSync(opts.input)
      ? readFileSync(opts.input, "utf8")
      : `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
  const tmp = mkdtempSync(join(tmpdir(), "fly-tw-"));
  const inFile = join(tmp, "in.css");
  const outFile = join(tmp, "out.css");
  try {
    writeFileSync(inFile, input);
    const args = ["-i", inFile, "-o", outFile];
    if (opts.contentGlobs?.length) {
      for (const g of opts.contentGlobs) args.push("--content", g);
    }
    if (bin.endsWith(".js")) {
      execFileSync("node", [bin, ...args], { stdio: "pipe", timeout: 30000 });
    } else {
      execFileSync(bin, args, { stdio: "pipe", timeout: 30000 });
    }
    if (!existsSync(outFile)) return null;
    return readFileSync(outFile, "utf8");
  } catch {
    return null;
  } finally {
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {}
  }
}

// Monta o CSS final: base interna (sempre) + tailwind quando habilitado.
// Nunca joga erro — no pior caso devolve só o interno.
export function buildCss(
  scan: ScanResult,
  componentCss: (file: string) => string,
  opts: { tailwind?: boolean; tailwindInput?: string; appDir?: string } = {},
): { css: string; engine: "internal" | "tailwind" } {
  const internal = collectStyles(scan, componentCss);
  if (!opts.tailwind) return { css: internal, engine: "internal" };
  const tw = buildWithTailwind({
    input: opts.tailwindInput,
    contentGlobs: opts.appDir ? [opts.appDir + "/**/*.fly"] : undefined,
  });
  if (!tw) return { css: internal, engine: "internal" };
  return { css: tw + "\n" + internal, engine: "tailwind" };
}
