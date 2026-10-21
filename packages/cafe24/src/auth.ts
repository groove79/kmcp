/**
 * Cafe24 OAuth2 (authorization_code + refresh_token).
 *
 *  authorize: https://{mall}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id&state&redirect_uri&scope
 *  token:     https://{mall}.cafe24api.com/api/v2/oauth/token  (Basic client_id:client_secret, form body)
 *  lifetimes: code 1 min (single use) · access 2 h · refresh 2 weeks (rotates on every refresh — old one is revoked)
 *
 * Because the refresh token rotates, we persist it. Store = a JSON file (default ~/.config/kmcp/cafe24/<mall>.json),
 * or the caller can inject any store (tests use memory).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  /** epoch ms */
  expires_at: number;
  refresh_expires_at: number;
  scopes?: string[];
}

export interface TokenStore {
  load(): Promise<TokenSet | null>;
  save(t: TokenSet): Promise<void>;
}

export class FileTokenStore implements TokenStore {
  constructor(private readonly file: string) {}
  static defaultPath(mallId: string) {
    return path.join(os.homedir(), ".config", "kmcp", "cafe24", `${mallId}.json`);
  }
  async load() {
    try { return JSON.parse(fs.readFileSync(this.file, "utf8")) as TokenSet; } catch { return null; }
  }
  async save(t: TokenSet) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(this.file, JSON.stringify(t, null, 2), { mode: 0o600 });
  }
}

export class MemoryTokenStore implements TokenStore {
  constructor(private t: TokenSet | null = null) {}
  async load() { return this.t; }
  async save(t: TokenSet) { this.t = t; }
}

export const DEFAULT_SCOPES = [
  "mall.read_product", "mall.write_product",
  "mall.read_order", "mall.write_order",
  "mall.read_community", "mall.write_community",
  "mall.read_store",
];

export interface Cafe24AuthOptions {
  mallId: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  scopes?: string[];
  store: TokenStore;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface RawToken {
  access_token: string; expires_at: string; refresh_token: string; refresh_token_expires_at: string;
  client_id: string; mall_id: string; user_id: string; scopes: string[]; issued_at: string;
}

export class Cafe24Auth {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  constructor(private readonly o: Cafe24AuthOptions) {
    this.fetchImpl = o.fetchImpl ?? fetch;
    this.now = o.now ?? (() => Date.now());
  }

  get base() { return `https://${this.o.mallId}.cafe24api.com/api/v2`; }

  authorizeUrl(state: string): string {
    const u = new URL(`${this.base}/oauth/authorize`);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("client_id", this.o.clientId);
    u.searchParams.set("state", state);
    u.searchParams.set("redirect_uri", this.o.redirectUri ?? "http://localhost:8787/callback");
    u.searchParams.set("scope", (this.o.scopes ?? DEFAULT_SCOPES).join(","));
    return u.href;
  }

  private async tokenRequest(body: URLSearchParams): Promise<TokenSet> {
    const basic = Buffer.from(`${this.o.clientId}:${this.o.clientSecret}`).toString("base64");
    const res = await this.fetchImpl(`${this.base}/oauth/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Cafe24 token request failed: HTTP ${res.status} ${text}`);
    const j = JSON.parse(text) as RawToken;
    const t: TokenSet = {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Date.parse(j.expires_at) || this.now() + 2 * 3600_000,
      refresh_expires_at: Date.parse(j.refresh_token_expires_at) || this.now() + 14 * 86400_000,
      scopes: j.scopes,
    };
    await this.o.store.save(t);
    return t;
  }

  /** Exchange an authorization code (from the browser redirect) for tokens. */
  async exchangeCode(code: string): Promise<TokenSet> {
    return this.tokenRequest(new URLSearchParams({
      grant_type: "authorization_code", code, redirect_uri: this.o.redirectUri ?? "http://localhost:8787/callback",
    }));
  }

  async refresh(refreshToken: string): Promise<TokenSet> {
    return this.tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }));
  }

  /** Valid access token, refreshing when < 5 min left. Throws a helpful error when no token has ever been issued. */
  async getAccessToken(): Promise<string> {
    const t = await this.o.store.load();
    if (!t) {
      throw new Error(
        `No Cafe24 token for mall "${this.o.mallId}". Run once:  npx @appmonster/mcp-cafe24 auth  (opens the browser, stores the token locally), ` +
        `or set CAFE24_REFRESH_TOKEN.`,
      );
    }
    if (this.now() < t.expires_at - 5 * 60_000) return t.access_token;
    if (this.now() >= t.refresh_expires_at) {
      throw new Error(`Cafe24 refresh token for "${this.o.mallId}" expired (2-week limit). Run:  npx @appmonster/mcp-cafe24 auth`);
    }
    return (await this.refresh(t.refresh_token)).access_token;
  }
}
