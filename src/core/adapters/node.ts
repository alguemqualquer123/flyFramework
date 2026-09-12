// Adapter Node: serve o pipeline via http.createServer.
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { scanApp } from "../../router/scanner.ts";
import { createPipeline, type FlyConfig } from "../pipeline.ts";

export function startNodeServer(config: FlyConfig, port = 3000) {
  const scan = scanApp(config.appDir);
  const pipeline = createPipeline(scan, config);

  const server = createServer(async (req, res) => {
    const host = req.headers.host ?? `localhost:${port}`;
    const url = new URL(req.url ?? "/", `http://${host}`);
    const hasBody = !["GET", "HEAD"].includes(req.method ?? "");
    let request: Request;
    try {
      request = new Request(url, {
        method: req.method,
        headers: req.headers as any,
        body: hasBody ? (req as any) : undefined,
        duplex: hasBody ? ("half" as any) : undefined,
      });
    } catch (err) {
      res.statusCode = 400;
      return res.end("Bad Request");
    }
    try {
      const response = await pipeline.handle(request);
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      if (req.method === "HEAD") return res.end();
      // Streaming real (SSE/chunked) quando o body é um ReadableStream; senão bufferiza.
      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
        return;
      }
      const buf = Buffer.from(await response.arrayBuffer());
      res.end(buf);
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end("Internal Error");
    }
  });

  server.listen(port, () => {
    console.log(`Fly dev server em http://localhost:${port}  (${scan.pages.length} páginas, ${scan.apis.length} APIs)`);
  });
  return server;
}
