// Deployment builders: emitem artefatos prontos para hospedar nas plataformas suportadas.
//  - VPS / Node (Docker): server/start.mjs runnable + Dockerfile.
//  - Vercel (serverless Node function): vercel/api/__fly.js + vercel.json.
//  - GitHub Pages (estático SSG): static/.nojekyll (só páginas SSG valem em estática pura).
// Consumido pelo `fly build` (ver core/build.ts).
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import type { ScanResult } from "../router/scanner.ts";

export type DeployOpts = {
  appDir: string;           // diretório com os .fly
  outDir?: string;          // .fly-out (default)
  siteUrl?: string;
  adapter?: "node" | "edge" | "serverless";
  frameworkRoot?: string;   // raiz que contém src/ do framework (repo)
};

function dockerfile(): { rel: string; data: string } {
  return {
    rel: "Dockerfile",
    data: [
      "FROM node:20-alpine",
      "WORKDIR /app",
      "",
      "# Copia o repositório (framework .ts + app .fly). O runtime lê os .fly em runtime.",
      "COPY . .",
      "",
      "ENV NODE_ENV=production PORT=3000",
      "EXPOSE 3000",
      "",
      "CMD [\"sh\", \"-c\", \"node src/cli/index.ts start\"]",
      "",
    ].join("\n"),
  };
}

function nodeServerEntry(appDir: string, frameworkRoot: string, outDir: string): { rel: string; data: string } {
  const serverDir = join(outDir, "server");
  const rel = (target: string) => relative(serverDir, target).split("\\").join("/");
  const appDirRel = rel(appDir) || ".";
  const scanner = rel(join(frameworkRoot, "src", "router", "scanner.ts"));
  const pipeline = rel(join(frameworkRoot, "src", "core", "pipeline.ts"));
  const body = [
    'import { createServer } from "node:http";',
    'import { Readable } from "node:stream";',
    `import { scanApp } from ${JSON.stringify(scanner)};`,
    `import { createPipeline } from ${JSON.stringify(pipeline)};`,
    `import { fileURLToPath } from "node:url";`,
    `const __dir = (() => { const f = import.meta.url; return f.startsWith("file:") ? new URL(".", f).pathname : process.cwd(); })();`,
    `const appDir = __dir + ${JSON.stringify(appDirRel + "/")};`,
    "const port = Number(process.env.PORT ?? 3000);",
    "const scan = scanApp(appDir);",
    'const pipeline = createPipeline(scan, { appDir, siteUrl: process.env.SITE_URL });',
    "const server = createServer(async (req, res) => {",
    "  const host = req.headers.host ?? `localhost:${port}`;",
    "  const url = new URL(req.url ?? '/', `http://${host}`);",
    "  const hasBody = !['GET','HEAD'].includes(req.method ?? '');",
    "  let request;",
    "  try { request = new Request(url, { method: req.method, headers: req.headers, body: hasBody ? req : undefined, duplex: hasBody ? 'half' : undefined }); }",
    "  catch { res.statusCode = 400; return res.end('Bad Request'); }",
    "  try {",
    "    const response = await pipeline.handle(request);",
    "    res.statusCode = response.status;",
    "    response.headers.forEach((v,k) => res.setHeader(k,v));",
    "    if (req.method === 'HEAD') return res.end();",
    "    if (response.body) return Readable.fromWeb(response.body).pipe(res);",
    "    return res.end(Buffer.from(await response.arrayBuffer()));",
    "  } catch (err) { console.error(err); res.statusCode = 500; res.end('Internal Error'); }",
    "});",
    "server.listen(port, () => console.log(`Fly server em http://localhost:${port} (${scan.pages.length} páginas)`));",
    "",
  ].join("\n");
  return { rel: "server/start.mjs", data: body };
}

function vercelJson(): { rel: string; data: string } {
  return {
    rel: "vercel/vercel.json",
    data: JSON.stringify({ version: 2, cleanUrls: true, trailingSlash: false, rewrites: [{ source: "/(.*)", destination: "/api/__fly" }] }, null, 2),
  };
}

function vercelFn(appDir: string, frameworkRoot: string, outDir: string): { rel: string; data: string } {
  const apiDir = join(outDir, "vercel", "api");
  const rel = (target: string) => relative(apiDir, target).split("\\").join("/");
  const appDirRel = rel(appDir) || ".";
  const scanner = rel(join(frameworkRoot, "src", "router", "scanner.ts"));
  const pipeline = rel(join(frameworkRoot, "src", "core", "pipeline.ts"));
  const body = [
    'const { Readable } = require("node:stream");',
    'const path = require("node:path");',
    `const appDir = path.join(__dirname, ${JSON.stringify(appDirRel)});`,
    `const { scanApp } = require(${JSON.stringify(scanner)});`,
    `const { createPipeline } = require(${JSON.stringify(pipeline)});`,
    "const scan = scanApp(appDir);",
    'const pipeline = createPipeline(scan, { appDir, siteUrl: process.env.SITE_URL });',
    "module.exports = async function handler(req, res) {",
    "  const url = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));",
    "  const hasBody = !['GET','HEAD'].includes(req.method);",
    "  let request;",
    "  try { request = new Request(url, { method: req.method, headers: req.headers, body: hasBody ? new Readable().wrap(req) : undefined, duplex: hasBody ? 'half' : undefined }); }",
    "  catch { res.statusCode = 400; return res.end('Bad Request'); }",
    "  return pipeline.handle(request).then((response) => {",
    "    res.statusCode = response.status; response.headers.forEach((v,k)=>res.setHeader(k,v));",
    "    if (response.body) { const s = Readable.fromWeb(response.body); s.on('error', ()=>res.end()); return s.pipe(res); }",
    "    return response.arrayBuffer().then((b)=>res.end(Buffer.from(b)));",
    "  }).catch((e)=>{ console.error(e); res.statusCode=500; res.end('Internal Error'); });",
    "};",
    "",
  ].join("\n");
  return { rel: "vercel/api/__fly.js", data: body };
}

export function buildDeploy(outDir: string, _scan: ScanResult, opts: DeployOpts): void {
  const write = (rel: string, data: string) => {
    const full = join(outDir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, data);
  };
  const root = opts.frameworkRoot ?? process.cwd();
  write(dockerfile().rel, dockerfile().data);
  write(nodeServerEntry(opts.appDir, root, outDir).rel, nodeServerEntry(opts.appDir, root, outDir).data);
  write(vercelJson().rel, vercelJson().data);
  write(vercelFn(opts.appDir, root, outDir).rel, vercelFn(opts.appDir, root, outDir).data);
  write("static/.nojekyll", "");
}