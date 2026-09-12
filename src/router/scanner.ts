// Scanner: descobre rotas a partir de arquivos .fly no app dir.
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

export type RouteEntry = {
  route: string;
  file: string;
  kind: "page" | "api" | "layout" | "loading" | "error";
  regex: RegExp;
  paramNames: string[];
};

export type ScanResult = {
  pages: RouteEntry[];
  apis: RouteEntry[];
  layouts: RouteEntry[];
  loadings: RouteEntry[];
  errors: RouteEntry[];
  actionFiles: string[];
  middleware?: string;
  middlewares?: string[];
  middlewareMatcher?: string[];
};

export function toRoute(relPath: string): string {
  let p = relPath.replace(/\\/g, "/").replace(/\.fly$/, "");
  p = p.replace(/\/\([^/]+\)/g, "").replace(/^\([^/]+\)\//, ""); // grupos (auth)
  p = p.replace(/\/index$/, "").replace(/^index$/, "");
  // catch-all [...rest] -> :rest* ; dynamic [slug] -> :slug
  p = p.replace(/\[\.\.\.([^\]]+)\]/g, ":$1*");
  p = p.replace(/\[([^\]]+)\]/g, ":$1");
  if (p === "" || p === "/") return "/";
  return p.startsWith("/") ? p : "/" + p;
}

export function toRegex(route: string): {
  regex: RegExp;
  paramNames: string[];
} {
  const paramNames: string[] = [];
  // Captura catch-all (:name*) e params :name na ordem em que aparecem, mantendo a
  // correspondência entre os índices de paramNames e os grupos de captura.
  const re = /:([A-Za-z0-9_]+)(\*)?/g;
  const groups: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(route))) {
    const name = m[1];
    const isCatchAll = !!m[2];
    groups.push(route.slice(last, m.index));
    groups.push(isCatchAll ? "(.*?)" : "([^/]+)");
    paramNames.push(name);
    last = m.index + m[0].length;
  }
  groups.push(route.slice(last));
  const pattern = groups.join("");
  return { regex: new RegExp("^" + pattern + "/?$"), paramNames };
}

export function scanApp(appDir: string): ScanResult {
  const pages: RouteEntry[] = [];
  const apis: RouteEntry[] = [];
  const layouts: RouteEntry[] = [];
  const loadings: RouteEntry[] = [];
  const errors: RouteEntry[] = [];
  const actionFiles: string[] = [];
  let middleware: string | undefined;
  const middlewares: string[] = [];
  let middlewareMatcher: string[] | undefined;

  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith(".fly")) continue;
      const base = name.replace(/\.fly$/, "");

      const relPath = relative(appDir, full);
      const isMw =
        base === "middleware" || relPath.split(/[\\/]/).includes("middleware");
      if (isMw) {
        middlewares.push(full);
        if (base === "middleware" && !middleware) middleware = full;
        try {
          const content = readFileSync(full, "utf8");
          const m = /export\s+const\s+matcher\s*=\s*\[([\s\S]*?)\]/.exec(
            content,
          );
          if (m && base === "middleware") {
            middlewareMatcher = m[1]
              .split(",")
              .map((s) => s.trim().replace(/["']/g, ""))
              .filter(Boolean);
          }
        } catch {
          /* ignora */
        }
        continue;
      }

      let content = "";
      try {
        content = readFileSync(full, "utf8");
      } catch {
        continue;
      }
      if (/^\s*["']use\s+server["']/.test(content)) {
        actionFiles.push(full);
        continue;
      }

      const rel = relative(appDir, full);
      const relNoExt = rel.replace(/\.fly$/, "");
      const dirRel = relNoExt.includes("/")
        ? relNoExt.slice(0, relNoExt.lastIndexOf("/"))
        : "";
      const fileName = relNoExt.includes("/")
        ? relNoExt.slice(relNoExt.lastIndexOf("/") + 1)
        : relNoExt;
      const baseNoExt = fileName;
      let route: string;
      if (
        baseNoExt === "index" ||
        baseNoExt === "page" ||
        baseNoExt === "layout" ||
        baseNoExt === "loading" ||
        baseNoExt === "error"
      ) {
        // Layouts/loadings/errors (assim como index/page) pertencem ao diretório, não ao arquivo.
        route = dirRel ? toRoute(dirRel) : "/";
      } else {
        route = (dirRel ? toRoute(dirRel) : "") + "/" + toRoute(baseNoExt);
      }
      route = route.replace(/\/+/g, "/");
      if (route !== "/" && route.endsWith("/")) route = route.slice(0, -1);
      const { regex, paramNames } = toRegex(route);
      let kind: RouteEntry["kind"] = "page";
      if (route.startsWith("/api/")) kind = "api";
      else if (baseNoExt === "layout") kind = "layout";
      else if (baseNoExt === "loading") kind = "loading";
      else if (baseNoExt === "error") kind = "error";
      const entry: RouteEntry = { route, file: full, kind, regex, paramNames };
      if (kind === "api") apis.push(entry);
      else if (kind === "layout") layouts.push(entry);
      else if (kind === "loading") loadings.push(entry);
      else if (kind === "error") errors.push(entry);
      else if (kind === "page") pages.push(entry);
    }
  }

  try {
    walk(appDir);
  } catch {
    // app dir inexistente
  }
  middlewares.sort();
  return {
    pages,
    apis,
    layouts,
    loadings,
    errors,
    actionFiles,
    middleware,
    middlewares,
    middlewareMatcher,
  };
}
