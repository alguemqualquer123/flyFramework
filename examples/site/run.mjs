// Runner do site de exemplo: sobe o server Node com o pipeline do Fly.
// Uso:
//   node examples/site/run.mjs            # porta 3000
//   PORT=8080 node examples/site/run.mjs  # porta 8080
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { startNodeServer } from "../../src/core/adapters/node.ts";

const root = dirname(fileURLToPath(import.meta.url));
const appDir = new URL("./app", import.meta.url).pathname;

// O site usa o diretório raiz (layout/site), então o appDir é o próprio examples/site.
startNodeServer(
  {
    appDir: root,
    siteUrl: process.env.SITE_URL ?? "https://loja.fly.dev",
    adapter: "node",
  },
  Number(process.env.PORT ?? 3000)
);
