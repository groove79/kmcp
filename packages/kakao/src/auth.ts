/**
 * Kakao Login OAuth (authorization_code + refresh_token) for the KakaoTalk message API.
 *
 *  authorize: https://kauth.kakao.com/oauth/authorize?client_id&redirect_uri&response_type=code&scope&state
 *  token:     https://kauth.kakao.com/oauth/token (form body; client_secret only if enabled in the app)
 *  lifetimes: access ≈ 6 h (REST), refresh ≈ 2 months; a new refresh token is returned only when < 1 month remains,
 *             so we keep the old one unless the response carries a new one.
 *
 * Tokens persist in a JSON file (default ~/.config/kmcp/kakao/<app>.json) or any injected store (tests use memory).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const AUTH_URL = "https://kauth.kakao.com/oauth/authorize";
export const TOKEN_URL = "https://kauth.kakao.com/oauth/token";
export const DEFAULT_REDIRECT = "http://localhost:8788/callback";
/** talk_message: send messages · friends: list KakaoTalk friends (needs the app's "친구 목록" permission) */
export const DEFAULT_SCOPES = ["talk_message", "friends"];

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  /** epoch ms */
  expires_at: number;
  refresh_expires_at: number;
  scope?: string;
}

export interface TokenStore {
  load(): Promise<TokenSet | null>;
  save(t: TokenSet): Promise<void>;
}

export class FileTokenStore implements TokenStore {
  constructor(private readonly file: string) {}
  static defaultPath(appKey: string) {
    return path.join(os.homedir(), ".config", "kmcp", "kakao", `${appKey.slice(0, 8)}.json`);
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

export interface KakaoAuthOptions {
  /** REST API key of the Kakao Developers app */
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  store: TokenStore;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface RawToken {
  token_type: string; access_token: string; expires_in: number;
  refresh_token?: string; refresh_token_expires_in?: number; scope?: string;
}

export class KakaoAuth {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  constructor(private readonly o: KakaoAuthOptions) {
    this.fetchImpl = o.fetchImpl ?? fetch;
    this.now = o.now ?? (() => Date.now());
  }

  authorizeUrl(state: string): string {
    const u = new URL(AUTH_URL);
    u.searchParams.set("client_id", this.o.clientId);
    u.searchParams.set("redirect_uri", this.o.redirectUri ?? DEFAULT_REDIRECT);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", (this.o.scopes ?? DEFAULT_SCOPES).join(","));
    u.searchParams.set("state", state);
    return u.href;
  }

  private async tokenRequest(params: Record<string, string>, prev: TokenSet | null): Promise<TokenSet> {
    const body = new URLSearchParams({ client_id: this.o.clientId, ...params });
    if (this.o.clientSecret) body.set("client_secret", this.o.clientSecret);
    const res = await this.fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Kakao token request failed: HTTP ${res.status} ${text}`);
    const j = JSON.parse(text) as RawToken;
    const now = this.now();
    const t: TokenSet = {
      access_token: j.access_token,
      refresh_token: j.refresh_token ?? prev?.refresh_token ?? "",
      expires_at: now + (j.expires_in ?? 21600) * 1000,
      refresh_expires_at: j.refresh_token ? now + (j.refresh_token_expires_in ?? 5184000) * 1000 : (prev?.refresh_expires_at ?? now + 5184000 * 1000),
      scope: j.scope ?? prev?.scope,
    };
    await this.o.store.save(t);
    return t;
  }

  async exchangeCode(code: string): Promise<TokenSet> {
    return this.tokenRequest({ grant_type: "authorization_code", code, redirect_uri: this.o.redirectUri ?? DEFAULT_REDIRECT }, null);
  }

  async refresh(prev: TokenSet): Promise<TokenSet> {
    return this.tokenRequest({ grant_type: "refresh_token", refresh_token: prev.refresh_token }, prev);
  }

  /** Valid access token, refreshing when < 5 min left. */
  async getAccessToken(): Promise<string> {
    const t = await this.o.store.load();
    if (!t) {
      throw new Error("No Kakao token. Run once:  npx @appmonster/mcp-kakao auth  (opens the browser, stores the token locally), or set KAKAO_REFRESH_TOKEN.");
    }
    if (this.now() < t.expires_at - 5 * 60_000) return t.access_token;
    if (this.now() >= t.refresh_expires_at) throw new Error("Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth");
    return (await this.refresh(t)).access_token;
  }
}
