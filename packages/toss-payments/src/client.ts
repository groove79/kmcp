/**
 * Toss Payments core API client.
 *   Base: https://api.tosspayments.com
 *   Auth: Basic base64("<secretKey>:")   (secret key as username, empty password)
 *   POST requests carry Idempotency-Key so a retried cancel never refunds twice.
 * Errors: {code, message} → agent-readable message.
 */
import { randomUUID } from "node:crypto";

export const BASE_URL = "https://api.tosspayments.com";

export class TossApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | undefined, message: string, public readonly body: unknown) {
    super(message);
    this.name = "TossApiError";
  }
}

export type Query = Record<string, string | number | undefined>;

export class TossClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly basic: string;
  readonly isTest: boolean;

  constructor(secretKey: string, opts: { fetchImpl?: typeof fetch; baseUrl?: string; idempotencyKey?: () => string } = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.baseUrl = opts.baseUrl ?? BASE_URL;
    this.basic = Buffer.from(`${secretKey}:`, "utf8").toString("base64");
    this.isTest = secretKey.startsWith("test_");
    this.newKey = opts.idempotencyKey ?? (() => randomUUID());
  }
  private readonly newKey: () => string;

  async request<T>(method: "GET" | "POST", path: string, opts: { query?: Query; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    const headers: Record<string, string> = { Authorization: `Basic ${this.basic}`, Accept: "application/json" };
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      headers["Idempotency-Key"] = opts.idempotencyKey ?? this.newKey();
    }
    const res = await this.fetchImpl(url, { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
    const text = await res.text();
    let json: unknown;
    try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
    if (!res.ok) {
      const j = (json ?? {}) as { code?: string; message?: string };
      throw new TossApiError(res.status, j.code, `Toss API ${method} ${path} → HTTP ${res.status}${j.code ? ` [${j.code}]` : ""}: ${j.message ?? text}`, json);
    }
    return json as T;
  }

  get<T>(path: string, query?: Query) { return this.request<T>("GET", path, { query }); }
  post<T>(path: string, body?: unknown, idempotencyKey?: string) { return this.request<T>("POST", path, { body, idempotencyKey }); }
}
