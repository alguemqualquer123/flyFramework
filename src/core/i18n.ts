// i18n do Fly: detecção por prefixo (/en/sobre), cookie e Accept-Language,
// dicionários em app/i18n/*.json e helper t() com interpolação.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { parseCookies } from "./utils.ts";

export type FlyI18nConfig = {
  defaultLocale: string;
  locales: string[];
  strategy?: "prefix" | "cookie";
};

export type Dicts = Record<string, Record<string, any>>;

export function loadDicts(appDir: string): Dicts {
  const dir = join(appDir, "i18n");
  const out: Dicts = {};
  try {
    if (!existsSync(dir)) return out;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      const locale = basename(f, ".json");
      try {
        out[locale] = JSON.parse(readFileSync(join(dir, f), "utf8"));
      } catch {}
    }
  } catch {}
  return out;
}

function lookup(
  dict: Record<string, any> | undefined,
  key: string,
): string | undefined {
  if (!dict) return undefined;
  if (dict[key] !== undefined && typeof dict[key] === "string")
    return dict[key];
  const parts = key.split(".");
  let cur: any = dict;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function createT(locale: string, dicts: Dicts, fallbackLocale?: string) {
  const t = (key: string, vars?: Record<string, string | number>): string => {
    let tpl =
      lookup(dicts[locale], key) ??
      (fallbackLocale ? lookup(dicts[fallbackLocale], key) : undefined) ??
      key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        tpl = tpl
          .split(`{${k}}`)
          .join(String(v))
          .split(`{{${k}}}`)
          .join(String(v));
      }
    }
    return tpl;
  };
  return t;
}

export function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return {
        lang: lang.trim().split("-")[0].toLowerCase(),
        q: q ? Number(q) : 1,
      };
    })
    .filter((x) => x.lang)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.lang);
}

// Extrai o locale do path (/en/about -> en) sem falhar quando não há prefixo.
export function localeFromPath(
  path: string,
  locales: string[],
): { locale: string | null; path: string } {
  const seg = path.split("/")[1] ?? "";
  if (locales.includes(seg)) {
    const rest = path.slice(seg.length + 1) || "/";
    return { locale: seg, path: rest.startsWith("/") ? rest : "/" + rest };
  }
  return { locale: null, path };
}

export function resolveLocale(request: Request, i18n: FlyI18nConfig): string {
  const url = new URL(request.url);
  const { locale: prefix } = localeFromPath(url.pathname, i18n.locales);
  if (prefix) return prefix;
  const cookie = parseCookies(request.headers.get("cookie") ?? "")[
    "fly_locale"
  ];
  if (cookie && i18n.locales.includes(cookie)) return cookie;
  const query = url.searchParams.get("lang") ?? url.searchParams.get("locale");
  if (query && i18n.locales.includes(query)) return query;
  for (const lang of parseAcceptLanguage(
    request.headers.get("accept-language"),
  )) {
    if (i18n.locales.includes(lang)) return lang;
  }
  return i18n.defaultLocale;
}

export function formatDate(
  date: Date | string | number,
  locale: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, opts).format(new Date(date));
}

export function formatNumber(
  n: number,
  locale: string,
  opts?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, opts).format(n);
}

export function localizedPath(
  path: string,
  locale: string,
  i18n: FlyI18nConfig,
): string {
  if (locale === i18n.defaultLocale) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}
