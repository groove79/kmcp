/**
 * Delivery Tracker (tracker.delivery) GraphQL client.
 * Auth: `Authorization: TRACKQL-API-KEY <clientId>:<clientSecret>` (API-key method; credentials from console.tracker.delivery).
 * Errors come back in the GraphQL `errors` array regardless of HTTP status — always inspect it.
 */
export const GRAPHQL_URL = "https://apis.tracker.delivery/graphql";

export class DeliveryApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly body: unknown) {
    super(message);
    this.name = "DeliveryApiError";
  }
}

const HINTS: Record<string, string> = {
  UNAUTHENTICATED: "Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → project → Credentials). IDs created before 2024-05-13 cannot be used as API keys — create new ones.",
  NOT_FOUND: "No such shipment for that carrier + tracking number. Check the carrier (CJ vs 우체국 etc.) and the number; brand-new labels can take up to a few hours to appear.",
  BAD_REQUEST: "Invalid tracking number format for this carrier, or unknown carrierId — use delivery_list_carriers.",
  INTERNAL: "Delivery Tracker had a temporary problem — retry in a minute.",
};

export interface GqlResult<T> { data?: T; errors?: Array<{ message: string; extensions?: { code?: string } }> }

export class DeliveryClient {
  private readonly fetchImpl: typeof fetch;
  private readonly url: string;
  private readonly authHeader: string;
  constructor(clientId: string, clientSecret: string, opts: { fetchImpl?: typeof fetch; url?: string; timeoutMs?: number } = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.url = opts.url ?? GRAPHQL_URL;
    this.authHeader = `TRACKQL-API-KEY ${clientId}:${clientSecret}`;
    this.timeoutMs = opts.timeoutMs ?? 15_000; // docs: typical < 1s, recommend ≤ 15s
  }
  private readonly timeoutMs: number;

  async query<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { Authorization: this.authHeader, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      if ((e as Error).name === "TimeoutError" || (e as Error).name === "AbortError") throw new DeliveryApiError("TIMEOUT", `Delivery Tracker did not answer within ${this.timeoutMs}ms`, null);
      throw e;
    }
    const text = await res.text();
    let json: GqlResult<T>;
    try { json = JSON.parse(text) as GqlResult<T>; } catch { throw new DeliveryApiError("BAD_RESPONSE", `Delivery Tracker HTTP ${res.status}: ${text.slice(0, 200)}`, text); }
    if (json.errors?.length) {
      const e = json.errors[0];
      const code = e.extensions?.code ?? (res.status === 401 || res.status === 403 ? "UNAUTHENTICATED" : "ERROR");
      throw new DeliveryApiError(code, `Delivery Tracker [${code}]: ${e.message}${HINTS[code] ? ` — ${HINTS[code]}` : ""}`, json);
    }
    if (!res.ok) throw new DeliveryApiError(String(res.status), `Delivery Tracker HTTP ${res.status}: ${text.slice(0, 200)}`, json);
    return json.data as T;
  }
}
