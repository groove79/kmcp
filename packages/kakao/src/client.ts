/**
 * Thin client for kapi.kakao.com. Kakao errors come back as {code: -N, msg} — surfaced with a hint for the common ones.
 */
import type { KakaoAuth } from "./auth.js";

export const API_BASE = "https://kapi.kakao.com";

export class KakaoApiError extends Error {
  constructor(public readonly status: number, public readonly code: number | undefined, message: string, public readonly body: unknown) {
    super(message);
    this.name = "KakaoApiError";
  }
}

const HINTS: Record<number, string> = {
  [-1]: "Kakao internal error — retry later",
  [-2]: "invalid request parameter",
  [-3]: "this API is not enabled for the app — turn on the feature (e.g. 카카오 로그인 > 동의항목 talk_message, or 카카오톡 소셜 > 친구 목록) in Kakao Developers",
  [-4]: "the user blocked the app / withdrew consent",
  [-10]: "API quota exceeded",
  [-401]: "token invalid or expired — run `mcp-kakao auth` again",
  [-402]: "missing scope — re-authorize with the required consent item",
  [-532]: "daily message limit for this sender exceeded",
};

export class KakaoClient {
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly auth: KakaoAuth, opts: { fetchImpl?: typeof fetch; baseUrl?: string } = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.baseUrl = opts.baseUrl ?? API_BASE;
  }
  private readonly baseUrl: string;

  async request<T>(method: "GET" | "POST", path: string, opts: { query?: Record<string, string | number | undefined>; form?: Record<string, string> } = {}): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    const token = await this.auth.getAccessToken();
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.form ? { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" } : {}),
      },
      body: opts.form ? new URLSearchParams(opts.form) : undefined,
    });
    const text = await res.text();
    let json: unknown;
    try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
    const j = (json ?? {}) as { code?: number; msg?: string };
    if (!res.ok || (typeof j.code === "number" && j.code < 0)) {
      const hint = j.code !== undefined && HINTS[j.code] ? ` (${HINTS[j.code]})` : "";
      throw new KakaoApiError(res.status, j.code, `Kakao API ${method} ${path} → HTTP ${res.status}${j.code !== undefined ? ` [${j.code}]` : ""}: ${j.msg ?? text}${hint}`, json);
    }
    return json as T;
  }

  get<T>(path: string, query?: Record<string, string | number | undefined>) { return this.request<T>("GET", path, { query }); }
  postForm<T>(path: string, form: Record<string, string>) { return this.request<T>("POST", path, { form }); }
}
