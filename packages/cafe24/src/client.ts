import type { Cafe24Auth } from "./auth.js";

export const DEFAULT_API_VERSION = "2026-06-01";

export class Cafe24ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | number | undefined, message: string, public readonly body: unknown) {
    super(message);
    this.name = "Cafe24ApiError";
  }
}

export class Cafe24Client {
  private readonly fetchImpl: typeof fetch;
  constructor(
    private readonly auth: Cafe24Auth,
    private readonly opts: { fetchImpl?: typeof fetch; apiVersion?: string; shopNo?: number } = {},
  ) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  get shopNo() { return this.opts.shopNo ?? 1; }

  async request<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, o: { query?: Record<string, string | number | undefined>; body?: unknown } = {}): Promise<T> {
    const url = new URL(`${this.auth.base}/admin${path}`);
    for (const [k, v] of Object.entries(o.query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    const token = await this.auth.getAccessToken();
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": this.opts.apiVersion ?? DEFAULT_API_VERSION,
      },
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    });
    const text = await res.text();
    let json: unknown; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
    if (!res.ok) {
      const e = (json as { error?: { code?: number | string; message?: string; more_info?: unknown } })?.error ?? {};
      throw new Cafe24ApiError(res.status, e.code, `Cafe24 API ${method} ${path} → HTTP ${res.status}${e.code ? ` [${e.code}]` : ""}: ${e.message ?? text}${e.more_info ? ` ${JSON.stringify(e.more_info)}` : ""}`, json);
    }
    return json as T;
  }
  get<T>(path: string, query?: Record<string, string | number | undefined>) { return this.request<T>("GET", path, { query }); }
  post<T>(path: string, body: unknown) { return this.request<T>("POST", path, { body }); }
  put<T>(path: string, body: unknown) { return this.request<T>("PUT", path, { body }); }
}
