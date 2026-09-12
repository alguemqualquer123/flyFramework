// CLI do Fly: dev / build / start / check / create / add.
import { startNodeServer } from "../core/adapters/node.ts";
import { createEdgeHandler } from "../core/adapters/edge.ts";
import { createServerlessHandler } from "../core/adapters/serverless.ts";
import { scanApp } from "../router/scanner.ts";
import config from "../../fly.config.ts";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { compile } from "../compiler/index.ts";
import { createBuild } from "../core/build.ts";
import { join, dirname } from "node:path";

function startApp() {
  const port = Number(process.env.PORT ?? 3000);
  // No dev/start local usamos o servidor Node (que já implementa todo o pipeline).
  // O adapter edge/serverless é usado por plataformas de produção (ver exports em
  // src/core/adapters/*.ts). Aqui apenas expomos o handler correto quando requisitado.
  const adapter = (config as any).adapter ?? "node";
  if (adapter === "edge") {
    createEdgeHandler(config as any);
    console.log("Fly: adapter=edge (handler exportado). Servindo local via Node.");
  } else if (adapter === "serverless") {
    createServerlessHandler(config as any);
    console.log("Fly: adapter=serverless (handler exportado). Servindo local via Node.");
  }
  startNodeServer(config as any, port);
}

async function buildCommand() {
  const scan = scanApp(config.appDir);
  const files = [
    ...scan.pages,
    ...scan.apis,
    ...scan.layouts,
    ...scan.loadings,
    ...scan.errors,
    ...scan.actionFiles.map((f: string) => ({ file: f, kind: "action" })),
    ...(scan.middleware ? [{ file: scan.middleware, kind: "middleware" }] : []),
  ];
  let n = 0;
  for (const entry of files) {
    compile(readFileSync(entry.file, "utf8"), { file: entry.file });
    n++;
  }
  const b = createBuild(scan, {
    appDir: config.appDir,
    siteUrl: config.siteUrl,
    minify: (config as any).build?.minify,
  });
  await b.buildProd();
  console.log(`Build ok: ${n} arquivos compilados -> .fly-out (SSG + client + SEO)`);
}

function check() {
  const scan = scanApp(config.appDir);
  const files = [
    ...scan.pages,
    ...scan.apis,
    ...scan.layouts,
    ...scan.loadings,
    ...scan.errors,
    ...scan.actionFiles.map((f: string) => ({ file: f, kind: "action" })),
    ...(scan.middleware ? [{ file: scan.middleware, kind: "middleware" }] : []),
  ];
  let ok = 0, err = 0;
  for (const entry of files) {
    try {
      compile(readFileSync(entry.file, "utf8"), { file: entry.file });
      ok++;
    } catch (e) {
      err++;
      console.error("ERRO em", entry.file, (e as Error).message);
    }
  }
  console.log(`check: ${ok} ok, ${err} erros`);
  process.exit(err ? 1 : 0);
}

function scaffold(name: string) {
  const dir = name || "my-fly-app";
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "api"), { recursive: true });
  mkdirSync(join(dir, "actions"), { recursive: true });
  writeFileSync(join(dir, "layout.fly"), `<html lang="pt-BR"><head>__FLY_HEAD__</head><body><div id="__fly"><slot/></div>__FLY_SCRIPTS__</body></html>\n`);
  writeFileSync(join(dir, "index.fly"), `<script>\n  let count = $state(0)\n</script>\n\n<h1>Olá Fly 🪰</h1>\n<p>Nova página em <code>{count}</code></p>\n<button on:click={() => count++}>Clique: {count}</button>\n<nav><Link href="/about">Sobre</Link></nav>\n`);
  writeFileSync(join(dir, "about.fly"), `<script>\n  export const render = "ssr"\n</script>\n\n<h1>Sobre</h1>\n<p>Framework full-stack compilado.</p>\n`);
  writeFileSync(join(dir, "api", "hello.fly"), `// API route\n\nexport function GET({ params }) {\n  return { message: "Olá do servidor!" }\n}\n`);
  writeFileSync(join(dir, "actions", "todo.fly"), `"use server"\n\nexport async function addTodo(text) {\n  return { ok: true, text }\n}\n`);
  console.log(`Criado projeto em ./${dir}`);
}

function add(route: string) {
  const kind = route.startsWith("api/") ? "api" : "page";
  const rel = route + ".fly";
  const file = join(config.appDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) { console.error("Já existe:", file); process.exit(1); }
  writeFileSync(file, kind === "api"
    ? `// API route\nexport function GET({ params }) {\n  return { ok: true }\n}\n`
    : `<script>\n  export const render = "ssr"\n</script>\n\n<h1>${route}</h1>\n`);
  console.log("Criado:", file);
}

function init(dir: string) {
  const d = dir || ".";
  mkdirSync(d, { recursive: true });
  const appDir = `./app`;
  mkdirSync(join(d, appDir), { recursive: true });
  writeFileSync(join(d, "fly.config.ts"),
`import { defineConfig } from "fly-framework";

export default defineConfig({
  appDir: new URL("./app", import.meta.url).pathname,
  siteUrl: "https://seu-site.dev",
  adapter: "node",
});
`);
  writeFileSync(join(d, "tsconfig.json"),
`{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": false,
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "app", "fly.config.ts"]
}
`);
  writeFileSync(join(d, "package.json"),
`{
  "name": "my-fly-app",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "fly dev",
    "build": "fly build",
    "start": "fly start",
    "check": "fly check"
  }
}
`);
  console.log(`Projeto inicializado em ./${d} (crie páginas em ./${appDir})`);
}

const cmd = process.argv[2] ?? "dev";
if (cmd === "dev" || cmd === "start") startApp();
else if (cmd === "build") buildCommand().catch((e: any) => { console.error(e); process.exit(1); });
else if (cmd === "check") check();
else if (cmd === "create") scaffold(process.argv[3]);
else if (cmd === "add") add(process.argv[3]);
else if (cmd === "init") init(process.argv[3]);
else {
  console.log("Uso: fly <dev|build|start|check|create [nome]|add [rota]|init [dir]>");
  process.exit(1);
}
