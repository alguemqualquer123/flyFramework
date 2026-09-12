// Adapter Serverless: gera handlers compatíveis com funções serverless (Vercel/AWS).
// Para Vercel, expomos um default handler recebendo (req: IncomingMessage, res) ou
// um Fetch handler (a partir do edge, mais simples). Aqui priorizamos a assinatura
// de Fetch handler, adotada por Vercel Functions via `export const config` + route.
import { createEdgeHandler, type FlyConfig } from "./edge.ts";

export function createServerlessHandler(config: FlyConfig) {
  return createEdgeHandler(config);
}

// Convenção Vercel: export default assinatura (req, res) também é suportada rejeitando
// a Web Request quando aplicável - mas mantemos o modelo Fetch handler como fonte única.
export function startServerless(config: FlyConfig) {
  return createServerlessHandler(config);
}
