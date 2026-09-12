// Cache de rota (camada 2): resposta HTTP completa (SSR/ISR).
import { dataCache } from "./data.ts";

type RouteEntry = {
  body: string;
  status: number;
  headers: Record<string, string>;
  expires: number;
};

class RouteCache {
  private store = new Map<string, RouteEntry>();

  get(key: string): RouteEntry | undefined {
    const e = this.store.get(key);
    if (e && e.expires > Date.now()) return e;
    if (e) this.store.delete(key);
    return undefined;
  }

  set(key: string, entry: Omit<RouteEntry, "expires">, ttl: number): void {
    const expires = ttl > 0 ? Date.now() + ttl * 1000 : Number.MAX_SAFE_INTEGER;
    this.store.set(key, { ...entry, expires });
  }

  revalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const routeCache = new RouteCache();
export { dataCache };
