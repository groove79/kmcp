/**
 * Naver Commerce API OAuth2 (client_credentials) token handling.
 *
 * client_secret_sign = base64( bcrypt.hash( `${clientId}_${timestampMs}`, clientSecret ) )
 * where clientSecret (발급받은 애플리케이션 시크릿) is used directly as the bcrypt salt.
 */
import bcrypt from "bcryptjs";

export const TOKEN_URL = "https://api.commerce.naver.com/external/v1/oauth2/token";

export interface TokenResponse {
  access_token: string;
  expires_in: number; // seconds
  token_type: string;
}

export function makeClientSecretSign(clientId: string, clientSecret: string, timestampMs: number): string {
  const password = `${clientId}_${timestampMs}`;
  const hashed = bcrypt.hashSync(password, clientSecret);
  return Buffer.from(hashed, "utf8").toString("base64");
}

export interface TokenProviderOptions {
  clientId: string;
  clientSecret: string;
  /** "SELF" for the seller's own store, "SELLER" with account id for 3rd-party. */
  type?: "SELF" | "SELLER";
  accountId?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/** Caches the token and refreshes it 60s before expiry. */
export class TokenProvider {
  private token: string | null = null;
  private expiresAt = 0;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  constructor(private readonly opts: TokenProviderOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.now = opts.now ?? (() => Date.now());
  }

  async getToken(): Promise<string> {
    if (this.token && this.now() < this.expiresAt - 60_000) return this.token;
    return this.refresh();
  }

  async refresh(): Promise<string> {
    const timestamp = this.now();
    const body = new URLSearchParams({
      client_id: this.opts.clientId,
      timestamp: String(timestamp),
      client_secret_sign: makeClientSecretSign(this.opts.clientId, this.opts.clientSecret, timestamp),
      grant_type: "client_credentials",
      type: this.opts.type ?? "SELF",
    });
    if (this.opts.type === "SELLER" && this.opts.accountId) body.set("account_id", this.opts.accountId);

    const res = await this.fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Naver token request failed: HTTP ${res.status} ${text}`);
    }
    const json = (await res.json()) as TokenResponse;
    if (!json.access_token) throw new Error("Naver token response missing access_token");
    this.token = json.access_token;
    this.expiresAt = timestamp + (json.expires_in ?? 10_800) * 1000;
    return this.token;
  }
}
