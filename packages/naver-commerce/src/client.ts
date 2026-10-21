/**
 * Thin HTTP client for Naver Commerce API.
 * Base: https://api.commerce.naver.com/external
 * Errors are turned into agent-readable messages (code + message from Naver when present).
 */
import { TokenProvider } from "./auth.js";

export const BASE_URL = "https://api.commerce.naver.com/external";

export class NaverApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "NaverApiError";
  }
}

export class NaverClient {
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly tokens: TokenProvider,
    opts: { fetchImpl?: typeof fetch; baseUrl?: string } = {},
  ) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.baseUrl = opts.baseUrl ?? BASE_URL;
  }

  private readonly baseUrl: string;

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    opts: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    const doFetch = async (token: string) =>
      this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });

    let res = await doFetch(await this.tokens.getToken());
    if (res.status === 401) res = await doFetch(await this.tokens.refresh());

    const text = await res.text();
    let json: unknown = undefined;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = text;
    }
    if (!res.ok) {
      const j = (json ?? {}) as { code?: string; message?: string; invalidInputs?: unknown };
      const detail = j.invalidInputs ? ` invalidInputs=${JSON.stringify(j.invalidInputs)}` : "";
      throw new NaverApiError(res.status, j.code, `Naver API ${method} ${path} → HTTP ${res.status}${j.code ? ` [${j.code}]` : ""}: ${j.message ?? text}${detail}`, json);
    }
    return json as T;
  }

  get<T>(path: string, query?: Record<string, string | number | undefined>) {
    return this.request<T>("GET", path, { query });
  }
  post<T>(path: string, body?: unknown, query?: Record<string, string | number | undefined>) {
    return this.request<T>("POST", path, { body, query });
  }
  put<T>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, { body });
  }

  /** plain fetch for downloading external resources (images) with the same fetch implementation */
  fetchRaw(url: string) { return this.fetchImpl(url); }

  /** multipart upload (product images). Files: [{name, bytes, contentType}] under the field "imageFiles". */
  async postMultipart<T>(path: string, files: Array<{ name: string; bytes: Uint8Array; contentType: string }>): Promise<T> {
    const form = new FormData();
    for (const f of files) form.append("imageFiles", new Blob([f.bytes as BlobPart], { type: f.contentType }), f.name);
    const doFetch = async (token: string) =>
      this.fetchImpl(this.baseUrl + path, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, body: form });
    let res = await doFetch(await this.tokens.getToken());
    if (res.status === 401) res = await doFetch(await this.tokens.refresh());
    const text = await res.text();
    let json: unknown;
    try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
    if (!res.ok) {
      const j = (json ?? {}) as { code?: string; message?: string };
      throw new NaverApiError(res.status, j.code, `Naver API POST ${path} → HTTP ${res.status}${j.code ? ` [${j.code}]` : ""}: ${j.message ?? text}`, json);
    }
    return json as T;
  }
}
