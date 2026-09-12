// Cache de dados (camada 1): TTL + invalidação por tags.
export type CacheOpts = { ttl?: number; tags?: string[] };

type Entry = { value: any; expires: number; tags: string[] };

class DataCache {
  private store = new Map<string, Entry>();
  private tags = new Map<string, Set<string>>();

  async fetch<T>(key: string, producer: () => Promise<T> | T, opts: CacheOpts = {}): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as T;
    const value = await producer();
    this.set(key, value, opts);
    return value;
  }

  set(key: string, value: any, opts: CacheOpts = {}): void {
    const ttl = opts.ttl ?? 0;
    const expires = ttl > 0 ? Date.now() + ttl * 1000 : Number.MAX_SAFE_INTEGER;
    const prev = this.store.get(key);
    if (prev) prev.tags.forEach((t) => this.tags.get(t)?.delete(key));
    const tagSet = new Set(opts.tags ?? []);
    this.store.set(key, { value, expires, tags: [...tagSet] });
    for (const t of tagSet) {
      if (!this.tags.has(t)) this.tags.set(t, new Set());
      this.tags.get(t)!.add(key);
    }
  }

  get(key: string): any | undefined {
    const hit = this.store.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;
    return undefined;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  revalidateTag(tag: string): void {
    const keys = this.tags.get(tag);
    if (!keys) return;
    for (const k of [...keys]) {
      this.store.delete(k);
      keys.delete(k);
    }
  }

  clear(): void {
    this.store.clear();
    this.tags.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const dataCache = new DataCache();
