// Mini-ORM embutido do Fly (zero-dependência): schema declarativo, validação,
// CRUD em memória com persistência em JSON. Pensado pra protótipos e apps
// pequenos sem subir um banco externo.
//
// Exemplo:
//   import { defineModel, createDb } from "./src/core/db.ts";
//   const User = defineModel("users", { name: "string", email: "string unique", age: "number?" });
//   const db = createDb({ models: [User] });
//   db.models.users.create({ name: "Ana", email: "ana@x.dev" });
//   db.models.users.findMany({ age: 30 });
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export type FieldType = "string" | "number" | "boolean" | "date";
export type FieldDef =
  | string
  | {
      type: FieldType;
      optional?: boolean;
      unique?: boolean;
      default?: unknown;
    };

export type ParsedField = {
  type: FieldType;
  optional: boolean;
  unique: boolean;
  default?: unknown;
};
export type ModelDef = { name: string; fields: Record<string, ParsedField> };

export function parseField(def: FieldDef): ParsedField {
  if (typeof def === "object") {
    return {
      type: def.type,
      optional: !!def.optional,
      unique: !!def.unique,
      default: def.default,
    };
  }
  const parts = String(def).trim().split(/\s+/);
  const rawType = parts[0].replace(/\?$/, "") as FieldType;
  const optional = parts[0].endsWith("?") || parts.includes("optional");
  const unique = parts.includes("unique");
  return { type: rawType, optional, unique };
}

export function defineModel(
  name: string,
  fields: Record<string, FieldDef>,
): ModelDef {
  const parsed: Record<string, ParsedField> = {};
  for (const [k, v] of Object.entries(fields)) parsed[k] = parseField(v);
  return { name, fields: parsed };
}

function checkType(type: FieldType, value: unknown): boolean {
  if (type === "string") return typeof value === "string";
  if (type === "number")
    return typeof value === "number" && !Number.isNaN(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "date") {
    if (value instanceof Date) return !Number.isNaN(value.getTime());
    if (typeof value === "string" || typeof value === "number")
      return !Number.isNaN(new Date(value as any).getTime());
    return false;
  }
  return false;
}

function normDate(v: unknown): string {
  return new Date(v as any).toISOString();
}

export type Row = Record<string, any> & { id: string };

function matches(row: Row, where?: Record<string, any>): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (v !== undefined && row[k] !== v) return false;
  }
  return true;
}

export type Table = {
  findMany(where?: Record<string, any>): Row[];
  findFirst(where?: Record<string, any>): Row | null;
  findUnique(where: Record<string, any>): Row | null;
  count(where?: Record<string, any>): number;
  create(data: Record<string, any>): Row;
  update(where: Record<string, any>, data: Record<string, any>): Row;
  upsert(where: Record<string, any>, data: Record<string, any>): Row;
  delete(where: Record<string, any>): boolean;
};

export type Db = {
  models: Record<string, Table>;
  save(): void;
  reset(): void;
};

export function createDb(
  opts: {
    models?: ModelDef[];
    path?: string;
    initial?: Record<string, Row[]>;
  } = {},
): Db {
  const filePath = opts.path;
  let store: Record<string, Row[]> = {};
  let seq = 1;

  if (opts.initial) {
    store = JSON.parse(JSON.stringify(opts.initial));
  } else if (filePath && existsSync(filePath)) {
    try {
      const raw = JSON.parse(readFileSync(filePath, "utf8"));
      store = raw.tables ?? raw ?? {};
      seq = raw.__seq ?? 1;
    } catch {
      store = {};
    }
  }

  const defs = new Map<string, ModelDef>();
  for (const m of opts.models ?? []) {
    defs.set(m.name, m);
    if (!store[m.name]) store[m.name] = [];
  }

  function persist() {
    if (!filePath) return;
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(
        filePath,
        JSON.stringify({ __seq: seq, tables: store }, null, 2),
      );
    } catch {}
  }

  function validate(
    def: ModelDef | undefined,
    data: Record<string, any>,
    partial = false,
  ): Record<string, any> {
    const out: Record<string, any> = {};
    if (!def) return { ...data };
    for (const [field, rule] of Object.entries(def.fields)) {
      const has = data[field] !== undefined;
      if (!has) {
        if (rule.default !== undefined && !partial) {
          out[field] =
            typeof rule.default === "function"
              ? (rule.default as any)()
              : rule.default;
          continue;
        }
        if (!rule.optional && !partial)
          throw new Error(`Campo obrigatório: ${field}`);
        continue;
      }
      const val = data[field];
      if (val === null || val === undefined) {
        if (!rule.optional) throw new Error(`Campo obrigatório: ${field}`);
        continue;
      }
      if (!checkType(rule.type, val))
        throw new Error(`Tipo inválido em ${field}: esperado ${rule.type}`);
      out[field] = rule.type === "date" ? normDate(val) : val;
    }
    // copia extras? não — schema é fechado, ignora desconhecidos
    return out;
  }

  function checkUnique(
    model: string,
    def: ModelDef | undefined,
    row: Row,
    ignoreId?: string,
  ) {
    if (!def) return;
    const rows = store[model] ?? [];
    for (const [field, rule] of Object.entries(def.fields)) {
      if (!rule.unique || row[field] === undefined) continue;
      const dup = rows.find(
        (r) => r.id !== ignoreId && r[field] === row[field],
      );
      if (dup) throw new Error(`Valor duplicado em ${field}: ${row[field]}`);
    }
  }

  function table(model: string): Table {
    const def = defs.get(model);
    const rows = () => {
      if (!store[model]) store[model] = [];
      return store[model];
    };
    return {
      findMany: (where) =>
        rows()
          .filter((r) => matches(r, where))
          .map((r) => ({ ...r })),
      findFirst: (where) => {
        const f = rows().find((r) => matches(r, where));
        return f ? { ...f } : null;
      },
      findUnique: (where) => {
        const keys = Object.keys(where);
        const f = rows().find((r) =>
          keys.every((k) => r[k] === (where as any)[k]),
        );
        return f ? { ...f } : null;
      },
      count: (where) => rows().filter((r) => matches(r, where)).length,
      create: (data) => {
        const clean = validate(def, data);
        const row: Row = { ...clean, id: String(seq++) };
        checkUnique(model, def, row);
        rows().push(row);
        persist();
        return { ...row };
      },
      update: (where, data) => {
        const list = rows();
        const idx = list.findIndex((r) => matches(r, where));
        if (idx === -1) throw new Error(`Registro não encontrado em ${model}`);
        const clean = validate(def, data, true);
        const next = { ...list[idx], ...clean };
        checkUnique(model, def, next, list[idx].id);
        list[idx] = next;
        persist();
        return { ...next };
      },
      upsert: (where, data) => {
        const found = rows().find((r) => matches(r, where));
        if (found) return table(model).update(where, data);
        return table(model).create({ ...where, ...data });
      },
      delete: (where) => {
        const list = rows();
        const idx = list.findIndex((r) => matches(r, where));
        if (idx === -1) return false;
        list.splice(idx, 1);
        persist();
        return true;
      },
    };
  }

  const models: Record<string, Table> = new Proxy({} as Record<string, Table>, {
    get: (_t, prop: string) => {
      if (prop === "__esModule") return false;
      return table(prop);
    },
  });

  return {
    models,
    save: persist,
    reset: () => {
      store = {};
      seq = 1;
      persist();
    },
  };
}

// Atalho: abre (ou cria) o banco padrão do app em <appDir>/db.json.
export function openAppDb(appDir: string, models: ModelDef[] = []): Db {
  return createDb({ path: appDir.replace(/\/$/, "") + "/db.json", models });
}
