// Variáveis de ambiente: carrega .env e disponibiliza no server (ctx.env) e no client (apenas PUBLIC_*).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

export function loadEnvFiles(dir: string = process.cwd()): Record<string, string> {
  const files = [".env", ".env.local"];
  const mode = process.env.NODE_ENV;
  if (mode) files.push(`.env.${mode}`);
  let merged: Record<string, string> = {};
  for (const f of files) {
    const p = join(dir, f);
    if (existsSync(p)) merged = { ...merged, ...parseEnv(readFileSync(p, "utf8")) };
  }
  return merged;
}

// Env completo do server: arquivos .env + process.env (process.env tem precedência).
export function serverEnv(dir?: string): Record<string, string> {
  return { ...loadEnvFiles(dir ?? process.cwd()), ...process.env } as Record<string, string>;
}

// Apenas variáveis expostas ao client (prefixo PUBLIC_).
export function publicEnv(env: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) if (k.startsWith("PUBLIC_")) out[k] = v;
  return out;
}
