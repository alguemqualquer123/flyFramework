// Geração de <head> (SEO): title, meta, OpenGraph, Twitter.
import { escapeHtml, escapeAttr } from "../runtime/server.ts";

export type Meta = {
  title?: string;
  description?: string;
  canonical?: string;
  openGraph?: Record<string, any>;
  twitter?: Record<string, any>;
  jsonLd?: Record<string, any> | Record<string, any>[];
};

export function renderHead(meta: Meta = {}, siteUrl = ""): string {
  let h = "";
  if (meta.title) h += `  <title>${escapeHtml(meta.title)}</title>\n`;
  if (meta.description)
    h += `  <meta name="description" content="${escapeAttr(meta.description)}">\n`;
  if (meta.canonical)
    h += `  <link rel="canonical" href="${escapeAttr(meta.canonical)}">\n`;
  if (siteUrl)
    h += `  <meta property="og:site_name" content="${escapeAttr(siteUrl)}">\n`;
  for (const [k, v] of Object.entries(meta.openGraph ?? {})) {
    h += `  <meta property="og:${escapeAttr(k)}" content="${escapeAttr(v)}">\n`;
  }
  for (const [k, v] of Object.entries(meta.twitter ?? {})) {
    h += `  <meta name="twitter:${escapeAttr(k)}" content="${escapeAttr(v)}">\n`;
  }
  if (meta.jsonLd) {
    h += `  <script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>\n`;
  }
  return h;
}
