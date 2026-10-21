/**
 * Thin HTTP client for Coupang Wing Open API. Signs every request with the CEA HMAC header.
 * Errors become agent-readable messages (code + message from Coupang when present).
 */
import { BASE_URL, sign } from "./auth.js";

export interface Credentials {
  accessKey: string;
  secretKey: string;
  /** Seller id issued by Coupang, e.g. A00012345 */
  vendorId: string;
}

export class CoupangApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | number | undefined,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "CoupangApiError";
  }
}

export type Query = Record<string, string | number | boolean | undefined>;

export class CoupangClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  readonly vendorId: string;

  constructor(
    private readonly creds: Credentials,
    opts: { fetchImpl?: typeof fetch; baseUrl?: string; now?: () => Date } = {},
  ) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.baseUrl = opts.baseUrl ?? BASE_URL;
    this.now = opts.now ?? (() => new Date());
    this.vendorId = creds.vendorId;
  }
  private readonly now: () => Date;

  /** Builds the query string once so the signed bytes and the sent bytes are identical. */
  static buildQuery(query?: Query): string {
    if (!query) return "";
    const parts: string[] = [];
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === "") continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.join("&");
  }

  async request<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, opts: { query?: Query; body?: unknown } = {}): Promise<T> {
    const query = CoupangClient.buildQuery(opts.query);
    const { authorization } = sign({ method, path, query, accessKey: this.creds.accessKey, secretKey: this.creds.secretKey, now: this.now() });
    const url = this.baseUrl + path + (query ? `?${query}` : "");
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json;charset=UTF-8" } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = text;
    }
    const j = (json ?? {}) as { code?: string | number; message?: string };
    // Coupang returns HTTP 200 with code "ERROR" for many business failures.
    const bizError = typeof j.code === "string" && j.code.toUpperCase() === "ERROR";
    if (!res.ok || bizError) {
      throw new CoupangApiError(res.status, j.code, `Coupang API ${method} ${path} → HTTP ${res.status}${j.code !== undefined ? ` [${j.code}]` : ""}: ${j.message ?? text}`, json);
    }
    return json as T;
  }

  get<T>(path: string, query?: Query) {
    return this.request<T>("GET", path, { query });
  }
  put<T>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, { body });
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, { body });
  }
}
