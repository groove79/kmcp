/**
 * Thin fetch wrapper for Korean public APIs. Two key families:
 *  - data.go.kr / odcloud  → DATA_GO_KR_KEY (use the *decoded* key; we URL-encode it ourselves)
 *  - juso.go.kr            → JUSO_KEY (optional; only kr_search_address needs it)
 */
export interface Keys {
  dataGoKr?: string;
  juso?: string;
}

export class PublicApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly body: unknown) {
    super(message);
    this.name = "PublicApiError";
  }
}

export class PublicClient {
  private readonly fetchImpl: typeof fetch;
  constructor(public readonly keys: Keys, opts: { fetchImpl?: typeof fetch } = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  requireKey(which: keyof Keys, envName: string, where: string): string {
    const k = this.keys[which];
    if (!k) throw new Error(`Missing ${envName}. Get a free key at ${where} and set it in your MCP client config env.`);
    return k;
  }

  async getJson<T>(url: URL): Promise<T> {
    const res = await this.fetchImpl(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    const text = await res.text();
    let json: unknown; try { json = JSON.parse(text); } catch { json = text; }
    if (!res.ok) throw new PublicApiError(res.status, `HTTP ${res.status} from ${url.host}${url.pathname}: ${text.slice(0, 300)}`, json);
    // data.go.kr returns 200 with an error envelope for bad keys
    const env = (json as { response?: { header?: { resultCode?: string; resultMsg?: string } } })?.response?.header;
    if (env && env.resultCode && env.resultCode !== "00") throw new PublicApiError(res.status, `data.go.kr error ${env.resultCode}: ${env.resultMsg}`, json);
    return json as T;
  }

  async postJson<T>(url: URL, body: unknown): Promise<T> {
    const res = await this.fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
    const text = await res.text();
    let json: unknown; try { json = JSON.parse(text); } catch { json = text; }
    if (!res.ok) throw new PublicApiError(res.status, `HTTP ${res.status} from ${url.host}${url.pathname}: ${text.slice(0, 300)}`, json);
    return json as T;
  }
}
