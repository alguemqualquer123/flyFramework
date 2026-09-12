// Matcher: casa um path com as rotas e extrai parâmetros.
import type { RouteEntry } from "./scanner.ts";

export function matchRoute(entries: RouteEntry[], path: string): { entry: RouteEntry; params: Record<string, string> } | null {
  for (const entry of entries) {
    const m = entry.regex.exec(path);
    if (m) {
      const params: Record<string, string> = {};
      entry.paramNames.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1])));
      return { entry, params };
    }
  }
  return null;
}
