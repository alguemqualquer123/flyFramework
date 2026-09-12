// API pública de invalidação (server actions / mutations).
export { dataCache, routeCache } from "./route.ts";

import { dataCache } from "./data.ts";
import { routeCache } from "./route.ts";

export function revalidateTag(tag: string): void {
  dataCache.revalidateTag(tag);
}

export function revalidatePath(path: string): void {
  // A chave de rota é prefixada com "route:" no pipeline; normaliza o path para casar.
  const p = path.startsWith("/") ? path : "/" + path;
  routeCache.revalidate("route:" + p);
}
