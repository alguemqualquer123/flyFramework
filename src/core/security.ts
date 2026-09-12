// Segurança: sessões assinadas (cookies), rate limiting em memória e proteção CSRF.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { parseCookies } from "./utils.ts";

// ---------- Sessões assinadas ----------
// Um cookie de sessão é `payload.signature` (HMAC-SHA256). Servidor lê e valida.
export class Session {
  private secret: string;
  private data: Record<string, any>;
  constructor(secret: string, data: Record<string, any> = {}) {
    this.secret = secret;
    this.data = data;
  }
  get(key: string): any { return this.data[key]; }
  set(key: string, val: any): void { this.data[key] = val; }
  delete(key: string): void { delete this.data[key]; }
  toCookie(): string {
    const payload = Buffer.from(JSON.stringify(this.data)).toString("base64url");
    const sig = signData(payload, this.secret);
    return `${payload}.${sig}`;
  }
  static fromCookie(cookie: string, secret: string): Session | null {
    const dot = cookie.indexOf(".");
    if (dot === -1) return null;
    const payload = cookie.slice(0, dot);
    const sig = cookie.slice(dot + 1);
    if (!verifyData(payload, sig, secret)) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      return new Session(secret, data);
    } catch {
      return null;
    }
  }
}

function signData(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
function verifyData(payload: string, sig: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(sig, "base64url");
  } catch {
    return false;
  }
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

// Helper de conveniência para uso em loaders/actions ("use server").
export function createSessionStore(secret: string) {
  return {
    getSession(request: Request): Session | null {
      const cookieHeader = request.headers.get("cookie") ?? "";
      const cookie = parseCookies(cookieHeader)["fly_session"];
      return cookie ? Session.fromCookie(cookie, secret) : null;
    },
    createSession(data: Record<string, any> = {}): Session {
      const s = new Session(secret, data);
      return s;
    },
    cookieHeader(session: Session, options = {} as Record<string, string>): string {
      const parts = [`fly_session=${session.toCookie()}`, "Path=/", "HttpOnly", "SameSite=Lax"];
      if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
      if (options.secure) parts.push("Secure");
      return parts.join("; ");
    },
  };
}

// ---------- Rate limiting (em memória, janela deslizante) ----------
type RateBucket = { count: number; reset: number };
const rateStore = new Map<string, RateBucket>();

export function rateLimit(key: string, opts: { limit?: number; windowMs?: number } = {}): { allowed: boolean; remaining: number; reset: number } {
  const limit = opts.limit ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const now = Date.now();
  const bucket = rateStore.get(key);
  if (!bucket || bucket.reset <= now) {
    rateStore.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: now + windowMs };
  }
  bucket.count++;
  const allowed = bucket.count <= limit;
  if (bucket.count > limit && Date.now() - bucket.reset > windowMs) rateStore.delete(key);
  return { allowed, remaining: Math.max(0, limit - bucket.count), reset: bucket.reset };
}

export function rateLimitClient(request: Request, opts?: { limit?: number; windowMs?: number }): { allowed: boolean; remaining: number; reset: number; key: string } {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const key = "rl:" + ip + ":" + request.url;
  return { ...rateLimit(key, opts), key };
}

// ---------- CSRF ----------
// Token por sessão; nas actions/forms validamos contra o cookie.
export function csrfToken(request: Request): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = parseCookies(cookieHeader)["fly_csrf"];
  if (cookie) return cookie;
  const fresh = randomBytes(16).toString("base64url");
  return fresh;
}

export function verifyCsrf(request: Request, expected?: string | null): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = parseCookies(cookieHeader)["fly_csrf"];
  if (!cookie || !expected) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
