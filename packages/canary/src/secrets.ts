/**
 * Secrets: static keys from env (GitHub Secrets in CI, /Volumes/Dev/.secrets/*.env locally),
 * rotating tokens from Neon `canary_secrets` (CANARY_DATABASE_URL) with an in-memory fallback.
 */
import fs from "node:fs";
import path from "node:path";
import type { TokenBag } from "./types.js";

const LOCAL_DIRS = ["/Volumes/Dev/.secrets", path.join(process.env.HOME ?? "", "mnt/Dev/.secrets")];

/** Loads every *.env in the local secrets dir into env (never overriding what CI already set). */
export function loadLocalEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const loaded: string[] = [];
  for (const dir of LOCAL_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".env"))) {
      for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (m && !env[m[1]]) { env[m[1]] = m[2].replace(/^["']|["']$/g, ""); loaded.push(m[1]); }
      }
    }
  }
  return loaded;
}

export class MemoryTokenBag implements TokenBag {
  constructor(private readonly m = new Map<string, string>()) {}
  async get(n: string) { return this.m.get(n) ?? null; }
  async set(n: string, v: string) { this.m.set(n, v); }
}

/** Neon/Postgres-backed bag. Table is created on first use. */
export class PgTokenBag implements TokenBag {
  private ready: Promise<void> | null = null;
  private pool: import("pg").Pool | null = null;
  constructor(private readonly url: string) {}
  private async init() {
    if (!this.ready) this.ready = (async () => {
      const { Pool } = await import("pg");
      this.pool = new Pool({ connectionString: this.url, ssl: { rejectUnauthorized: false }, max: 2 });
      await this.pool.query("create table if not exists canary_secrets (name text primary key, value text not null, updated_at timestamptz not null default now())");
    })();
    await this.ready;
  }
  async get(n: string) { await this.init(); const r = await this.pool!.query("select value from canary_secrets where name=$1", [n]); return r.rows[0]?.value ?? null; }
  async set(n: string, v: string) { await this.init(); await this.pool!.query("insert into canary_secrets(name,value,updated_at) values($1,$2,now()) on conflict(name) do update set value=excluded.value, updated_at=now()", [n, v]); }
  async close() { await this.pool?.end(); }
}

/** Local fallback: one JSON file next to the other secrets (0600). */
export class FileTokenBag implements TokenBag {
  private m: Record<string, string>;
  constructor(private readonly file: string) { try { this.m = JSON.parse(fs.readFileSync(file, "utf8")); } catch { this.m = {}; } }
  async get(n: string) { return this.m[n] ?? null; }
  async set(n: string, v: string) { this.m[n] = v; fs.mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 }); fs.writeFileSync(this.file, JSON.stringify(this.m, null, 2) + "\n", { mode: 0o600 }); }
}

/** Seeds the bag from env for names not yet stored (first run), returns the bag. */
export async function makeTokenBag(env: NodeJS.ProcessEnv, seedNames: string[]): Promise<TokenBag & { close?: () => Promise<void> }> {
  const localDir = LOCAL_DIRS.find((d) => fs.existsSync(d));
  const bag = env.CANARY_DATABASE_URL ? new PgTokenBag(env.CANARY_DATABASE_URL) : localDir ? new FileTokenBag(path.join(localDir, "canary-tokens.json")) : new MemoryTokenBag();
  for (const n of seedNames) {
    if (env[n] && !(await bag.get(n))) await bag.set(n, env[n]!);
  }
  return bag;
}

/**
 * Adapter: a package TokenStore ({load,save} of a TokenSet JSON) persisted as one row in the bag.
 * Used for Cafe24 (refresh rotates every call) and Kakao.
 */
export function bagTokenStore<T>(bag: TokenBag, name: string, fallback: () => T | null) {
  return {
    async load(): Promise<T | null> { const v = await bag.get(name); if (v) { try { return JSON.parse(v) as T; } catch { /* ignore */ } } return fallback(); },
    async save(t: T): Promise<void> { await bag.set(name, JSON.stringify(t)); },
  };
}
