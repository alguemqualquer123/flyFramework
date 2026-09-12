// HMR do Fly: observa arquivos .fly, invalida o cache do compilador e avisa o
// browser via SSE (/__fly/hmr). O client tenta hot-swap (só o HTML/CSS, sem
// reload) e cai pra recarga preservando estado quando precisa.
import { watch } from "node:fs";
import { relative } from "node:path";
import { invalidateCompiled } from "../compiler/index.ts";
import { routeCache } from "../cache/route.ts";

export type HmrClient = { enqueue: (msg: string) => void; close: () => void };

export function createHmr(appDir: string) {
  const clients = new Set<HmrClient>();
  let seq = 0;

  function broadcast(file: string) {
    seq++;
    const rel = relative(appDir, file).replace(/\\/g, "/");
    const payload = `data: ${JSON.stringify({ file: rel, seq })}\n\n`;
    for (const c of [...clients]) {
      try {
        c.enqueue(payload);
      } catch {
        clients.delete(c);
      }
    }
  }

  function onFileChanged(file: string) {
    if (!file.endsWith(".fly")) return;
    invalidateCompiled(file);
    try {
      routeCache.clear();
    } catch {}
    broadcast(file);
  }

  function watchApp() {
    try {
      const watcher = watch(
        appDir,
        { recursive: true } as any,
        (_evt, name) => {
          if (!name) return;
          const full = appDir + "/" + String(name).replace(/\\/g, "/");
          onFileChanged(full);
        },
      );
      watcher.on("error", () => {});
      return watcher;
    } catch {
      return null;
    }
  }

  function sseHandler(): Response {
    let client!: HmrClient;
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        client = {
          enqueue: (msg) => controller.enqueue(enc.encode(msg)),
          close: () => {
            clients.delete(client);
            try {
              controller.close();
            } catch {}
          },
        };
        clients.add(client);
        controller.enqueue(enc.encode(`: conectado ao HMR do Fly\n\n`));
        const ping = setInterval(() => {
          try {
            controller.enqueue(enc.encode(`: ping ${Date.now()}\n\n`));
          } catch {
            clearInterval(ping);
            clients.delete(client);
          }
        }, 25000);
      },
      cancel() {
        if (client) clients.delete(client);
      },
    });
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  }

  return { clients, broadcast, onFileChanged, watchApp, sseHandler };
}
