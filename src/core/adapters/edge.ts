// Adapter Edge: expõe o pipeline como um Fetch handler padrão de plataformas edge
// (Cloudflare Workers, Deno Deploy, Bun, Vercel Edge, etc.). O pipeline inteiro já é
// web-standard (Request -> Response), então nada muda no código de aplicação.
import { scanApp } from "../../router/scanner.ts";
import { createPipeline, type FlyConfig } from "../pipeline.ts";

export function createEdgeHandler(config: FlyConfig) {
  const scan = scanApp(config.appDir);
  const pipeline = createPipeline(scan, config);
  return (request: Request, _context?: unknown): Promise<Response> =>
    pipeline.handle(request);
}

// Convenção comumente esperada por plataformas edge (default export do handler).
export function startEdge(config: FlyConfig) {
  return createEdgeHandler(config);
}
