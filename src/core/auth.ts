// Auth pronta do Fly: registro/login/logout com senha hash (scrypt) + sessão
// assinada em cookie. Usa o mini-ORM (db.ts) e o Session de security.ts.
//
// Uso típico numa server action ou loader:
//   import { createAuth } from "./src/core/auth.ts";
//   import { createDb } from "./src/core/db.ts";
//   import { UserModel } from "./src/core/auth.ts";
//
//   const db = createDb({ models: [UserModel], path: "./app/db.json" });
//   const auth = createAuth({ secret: process.env.AUTH_SECRET!, db });
//
//   export async function register(data) { return auth.register(data); }
//   export async function login(data) { return auth.login(data); }
//   export async function loader({ request }) {
//     const user = await auth.getUser(request); // null se anônimo
//     ...
//   }
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { createSessionStore } from "./security.ts";
import { defineModel } from "./db.ts";
import { FlyRedirect } from "./utils.ts";

export const UserModel = defineModel("users", {
  name: "string?",
  email: "string unique",
  password: "string",
  createdAt: { type: "string", optional: true },
});

export type PublicUser = {
  id: string;
  name?: string;
  email: string;
  createdAt?: string;
};
export type DbLike = {
  models: Record<
    string,
    {
      create(data: any): any;
      findUnique(where: any): any;
      findFirst(where: any): any;
      update(where: any, data: any): any;
    }
  >;
};

function toPublic(row: any): PublicUser {
  const { password: _pw, ...rest } = row ?? {};
  return rest;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32).toString("base64url");
  return `scrypt$1$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, _v, salt, hash] = stored.split("$");
    if (algo !== "scrypt" || !salt || !hash) return false;
    const probe = scryptSync(password, salt, 32);
    const expected = Buffer.from(hash, "base64url");
    return probe.length === expected.length && timingSafeEqual(probe, expected);
  } catch {
    return false;
  }
}

export function createAuth(opts: {
  secret: string;
  db: DbLike;
  usersModel?: string;
  loginPath?: string;
}) {
  const model = opts.usersModel ?? "users";
  const loginPath = opts.loginPath ?? "/login";
  const sessions = createSessionStore(opts.secret);

  function users() {
    return (opts.db.models as any)[model];
  }

  async function register(input: {
    name?: string;
    email: string;
    password: string;
  }): Promise<{ user: PublicUser; cookie: string }> {
    const email = String(input.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(input.password ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      throw new Error("E-mail inválido.");
    if (password.length < 4) throw new Error("Senha muito curta (mín. 4).");
    const exists = await users().findUnique({ email });
    if (exists) throw new Error("E-mail já cadastrado.");
    const row = await users().create({
      name: input.name?.trim() || undefined,
      email,
      password: hashPassword(password),
      createdAt: new Date().toISOString(),
    });
    const session = sessions.createSession({ uid: row.id });
    return {
      user: toPublic(row),
      cookie: sessions.cookieHeader(session, { maxAge: "2592000" }),
    };
  }

  async function login(input: {
    email: string;
    password: string;
  }): Promise<{ user: PublicUser; cookie: string }> {
    const email = String(input.email ?? "")
      .trim()
      .toLowerCase();
    const row = await users().findUnique({ email });
    if (!row || !verifyPassword(String(input.password ?? ""), row.password)) {
      throw new Error("E-mail ou senha inválidos.");
    }
    const session = sessions.createSession({ uid: row.id });
    return {
      user: toPublic(row),
      cookie: sessions.cookieHeader(session, { maxAge: "2592000" }),
    };
  }

  async function getUser(request: Request): Promise<PublicUser | null> {
    const session = sessions.getSession(request);
    const uid = session?.get("uid");
    if (!uid) return null;
    const row = await users().findUnique({ id: String(uid) });
    return row ? toPublic(row) : null;
  }

  async function requireAuth(request: Request): Promise<PublicUser> {
    const user = await getUser(request);
    if (!user) throw new FlyRedirect(loginPath, 307);
    return user;
  }

  function logoutCookie(): string {
    return "fly_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  }

  return {
    register,
    login,
    logoutCookie,
    getUser,
    requireAuth,
    hashPassword,
    verifyPassword,
    UserModel,
  };
}
