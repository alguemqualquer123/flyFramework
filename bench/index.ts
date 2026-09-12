// Benchmarks do Fly: compilação, SSR, memória, cache, server components, bundle.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { compile } from "../src/compiler/index.ts";
import { scanApp } from "../src/router/scanner.ts";
import { createPipeline } from "../src/core/pipeline.ts";
import { dataCache } from "../src/cache/data.ts";

const ROOT = join(process.cwd());
function walk(dir: string, acc: string[] = []) {
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walk(f, acc);
    else if (f.endsWith(".fly")) acc.push(f);
  }
  return acc;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
function bar(label: string, value: string) {
  console.log(`  ${label.padEnd(34)} ${value}`);
}

async function main() {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  FLY FRAMEWORK — BENCHMARKS");
  console.log("  Node " + process.version + " | " + (process.arch));
  console.log("══════════════════════════════════════════════════════\n");

  const files = [...walk(join(ROOT, "examples"))];
  const req = new Request("http://localhost/");
  const url = new URL("http://localhost/");

  // 1) COMPILAÇÃO
  console.log("⚡ COMPILAÇÃO (média por componente)");
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const N = 500;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) compile(src);
    const ms = (performance.now() - t0) / N;
    bar(join("examples", f.split("examples/")[1]), `${fmt(ms)} ms  (${(1000 / ms).toFixed(0)} comp/s)`);
  }

  // 2) SSR THROUGHPUT
  console.log("\n🚀 SSR THROUGHPUT (render/s)");
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const c = compile(src);
    const N = 5000;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) await c.render({ params: { slug: "x", id: "3" }, request: req, url, cache: dataCache });
    const ms = performance.now() - t0;
    bar(join("examples", f.split("examples/")[1]), `${fmt(N / (ms / 1000))} render/s`);
  }

  // 3) MEMÓRIA
  console.log("\n💾 MEMÓRIA (heap delta por 5000 renders)");
  {
    const f = join(ROOT, "examples/real-app/index.fly");
    const c = compile(readFileSync(f, "utf8"));
    global.gc?.();
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 5000; i++) await c.render({ params: {}, request: req, url, cache: dataCache });
    global.gc?.();
    const after = process.memoryUsage().heapUsed;
    bar("real-app/index.fly", `${fmt((after - before) / 1024)} KB delta`);
    bar("heap total agora", `${fmt(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
  }

  // 4) CACHE (DB simulado 5ms)
  console.log("\n🗄️ CACHE (DB simulado ~5ms)");
  {
    const db = () => new Promise((r) => setTimeout(() => r("rows"), 5));
    const N = 1000;
    let miss = 0, hit = 0;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) { await dataCache.fetch("bench:" + (i % 10), db, { ttl: 60 }); hit++; }
    const cachedMs = performance.now() - t0;
    const t1 = performance.now();
    for (let i = 0; i < N; i++) { await db(); miss++; }
    const uncachedMs = performance.now() - t1;
    bar("sem cache (1000x DB)", `${fmt(uncachedMs)} ms`);
    bar("com cache (1000x hit)", `${fmt(cachedMs)} ms`);
    bar("speedup", `${fmt(uncachedMs / cachedMs)}x`);
  }

  // 5) SERVER COMPONENTS (render server-only pesado)
  console.log("\n🖥️ SERVER COMPONENTS (HTML gerado no server)");
  {
    const f = join(ROOT, "examples/real-app/products/[id].fly");
    const c = compile(readFileSync(f, "utf8"));
    const N = 5000;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) await c.render({ params: { id: String(i % 50) }, request: req, url, cache: dataCache });
    const ms = performance.now() - t0;
    bar("products/[id].fly", `${fmt(N / (ms / 1000))} render/s`);
  }

  // 6) BUNDLE DO CLIENTE
  console.log("\n📦 CLIENT RUNTIME (hidratação mínima)");
  {
    const rt = readFileSync(join(ROOT, "src/runtime/client.js"), "utf8");
    const raw = Buffer.byteLength(rt);
    const gz = gzipSync(rt).length;
    bar("Fly client (raw)", `${fmt(raw / 1024)} KB`);
    bar("Fly client (gzip)", `${fmt(gz / 1024)} KB`);
    // Referência: React 18 + ReactDOM (produção, gzip) ~ 45 KB no client
    const reactRefGz = 45;
    bar("React+ReactDOM (ref gzip)", `~${reactRefGz} KB`);
    bar("economia vs React", `${fmt((1 - gz / (reactRefGz * 1024)) * 100)}% menor`);
  }

  console.log("\n══════════════════════════════════════════════════════\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
