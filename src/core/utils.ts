// Utilitários disponíveis em loaders, actions, api e middleware.
import { revalidateTag, revalidatePath } from "../cache/revalidate.ts";

export class FlyRedirect {
  url: string;
  status: number;
  constructor(url: string, status = 307) {
    this.url = url;
    this.status = status;
  }
}
export class FlyNotFound {}

export function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(
      part.slice(idx + 1).trim(),
    );
  }
  return out;
}

export type FlyCtx = { request?: Request };

export function makeFlyUtils(ctx: FlyCtx) {
  const headerCookie = ctx.request?.headers?.get?.("cookie") ?? "";
  return {
    redirect: (url: string, status = 307) => {
      throw new FlyRedirect(url, status);
    },
    notFound: () => {
      throw new FlyNotFound();
    },
    cookies: () => parseCookies(headerCookie),
    headers: () => ctx.request?.headers,
    revalidateTag,
    revalidatePath,
  };
}
