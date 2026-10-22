import type { Cafe24Auth } from "./auth.js";

export const DEFAULT_API_VERSION = "2026-09-01";

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
    this.apiVersion = opts.apiVersion ?? DEFAULT_API_VERSION;
  }

  get shopNo() { return this.opts.shopNo ?? 1; }
  /** Version actually in use; starts at opts.apiVersion/DEFAULT and follows Cafe24's "default value ... is X" hint if ours is retired. */
  apiVersion: string;

  async request<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, o: { query?: Record<string, string | number | undefined>; body?: unknown } = {}, retried = false): Promise<T> {
    const url = new URL(`${this.auth.base}/admin${path}`);
    for (const [k, v] of Object.entries(o.query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    const token = await this.auth.getAccessToken();
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": this.apiVersion,
      },
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    });
    const text = await res.text();
    let json: unknown; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
    if (!res.ok) {
      const e = (json as { error?: { code?: number | string; message?: string; more_info?: unknown } })?.error ?? {};
      // Verified live (2026-10-22): a retired version answers 400 "<v> version you requested is not available. The default value for the app version is <X>."
      const m = res.status === 400 && !retried ? /default value for the app version is (\d{4}-\d{2}-\d{2})/.exec(e.message ?? "") : null;
      if (m && m[1] !== this.apiVersion) { this.apiVersion = m[1]; return this.request<T>(method, path, o, true); }
      throw new Cafe24ApiError(res.status, e.code, `Cafe24 API ${method} ${path} → HTTP ${res.status}${e.code ? ` [${e.code}]` : ""}: ${e.message ?? text}${e.more_info ? ` ${JSON.stringify(e.more_info)}` : ""}`, json);
    }
    return json as T;
  }
  get<T>(path: string, query?: Record<string, string | number | undefined>) { return this.request<T>("GET", path, { query }); }
  post<T>(path: string, body: unknown) { return this.request<T>("POST", path, { body }); }
  put<T>(path: string, body: unknown) { return this.request<T>("PUT", path, { body }); }
}
