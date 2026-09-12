// Geração de sitemap.xml e robots.txt a partir das rotas conhecidas.
export function buildSitemap(routes: string[], siteUrl: string): string {
  const urls = routes
    .filter((r) => !r.includes(":") && !r.startsWith("/api/"))
    .map((r) => `  <url><loc>${siteUrl}${r === "/" ? "" : r}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export function buildRobots(siteUrl: string, extra?: string): string {
  const base = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
  return extra && extra.trim() ? base + "\n" + extra.trim() + "\n" : base;
}
