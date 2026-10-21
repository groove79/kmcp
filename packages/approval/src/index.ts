/**
 * @appmonster/approval — ask a human before an agent does something irreversible.
 *
 *   const approve = createApprover({ baseUrl: "https://ok.appmonster.co.kr", apiKey: "…" });
 *   createServer({ …, approveWrite: approve });          // any K-MCP server
 *
 * Protocol (served by the OK Agent service, see /Volumes/Dev/okagent):
 *   POST {baseUrl}/api/v1/requests            → { id, status: "pending", approveUrl, expiresAt }
 *   GET  {baseUrl}/api/v1/requests/{id}       → { id, status: "pending" | "approved" | "rejected" | "expired", decidedAt?, note? }
 *   Auth: Authorization: Bearer <apiKey>
 */

export type Decision = "approved" | "rejected" | "expired" | "pending";

export interface ApprovalRequest {
  /** Short human title, e.g. "스마트스토어 재고 변경" */
  title: string;
  /** What exactly will happen, in plain words */
  description?: string;
  /** Tool/action identifier, e.g. "naver_update_stock" */
  action: string;
  /** The arguments the agent wants to run with (shown to the approver) */
  payload?: unknown;
  /** Money involved, if any */
  amount?: number;
  currency?: string;
  /** Which agent/app is asking (shown to the approver) */
  source?: string;
  /** Seconds until the request expires unanswered (default 600) */
  expiresIn?: number;
}

export interface ApprovalResult {
  id: string;
  status: Decision;
  approveUrl?: string;
  note?: string;
  decidedAt?: string;
  expiresAt?: string;
}

export interface ApproverOptions {
  baseUrl: string;
  apiKey: string;
  /** How long to wait for a decision before giving up (ms, default 10 min) */
  timeoutMs?: number;
  /** Poll interval (ms, default 3s) */
  pollMs?: number;
  /** Name shown to the approver as the requester */
  source?: string;
  /** Build the request from a tool call; default makes a sensible one */
  describe?: (toolName: string, args: unknown) => Partial<ApprovalRequest>;
  /** Decides whether a given tool call needs approval at all (default: everything) */
  needsApproval?: (toolName: string, args: unknown) => boolean;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Called with the approve URL as soon as the request exists — e.g. to show it to the user */
  onPending?: (r: ApprovalResult) => void;
}

export class ApprovalClient {
  private readonly f: typeof fetch;
  constructor(private readonly o: { baseUrl: string; apiKey: string; fetchImpl?: typeof fetch }) {
    this.f = o.fetchImpl ?? fetch;
  }
  private url(p: string) { return this.o.baseUrl.replace(/\/+$/, "") + p; }
  private headers() { return { Authorization: `Bearer ${this.o.apiKey}`, "Content-Type": "application/json", Accept: "application/json" }; }

  async create(req: ApprovalRequest): Promise<ApprovalResult> {
    const res = await this.f(this.url("/api/v1/requests"), { method: "POST", headers: this.headers(), body: JSON.stringify(req) });
    if (!res.ok) throw new Error(`approval service: create failed HTTP ${res.status} ${await res.text().catch(() => "")}`);
    return (await res.json()) as ApprovalResult;
  }

  async get(id: string): Promise<ApprovalResult> {
    const res = await this.f(this.url(`/api/v1/requests/${encodeURIComponent(id)}`), { headers: this.headers() });
    if (!res.ok) throw new Error(`approval service: get failed HTTP ${res.status}`);
    return (await res.json()) as ApprovalResult;
  }

  /** Create and wait until decided / expired / timeout. */
  async ask(req: ApprovalRequest, opts: { timeoutMs?: number; pollMs?: number; sleep?: (ms: number) => Promise<void>; onPending?: (r: ApprovalResult) => void } = {}): Promise<ApprovalResult> {
    const timeoutMs = opts.timeoutMs ?? 10 * 60_000, pollMs = opts.pollMs ?? 3000;
    const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    const created = await this.create(req);
    opts.onPending?.(created);
    if (created.status !== "pending") return created;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await sleep(pollMs);
      const r = await this.get(created.id);
      if (r.status !== "pending") return r;
    }
    return { ...created, status: "expired", note: "no decision within timeout" };
  }
}

/** Default human-readable framing for a tool call. */
export function describeToolCall(toolName: string, args: unknown): ApprovalRequest {
  const a = (args ?? {}) as Record<string, unknown>;
  const money = typeof a.amount === "number" ? a.amount : typeof a.price === "number" ? a.price : undefined;
  const [platform, ...rest] = toolName.split("_");
  const verb = rest.join(" ");
  return {
    title: `${platform.toUpperCase()}: ${verb}`,
    description: summarizeArgs(a),
    action: toolName,
    payload: args,
    amount: money,
    currency: money !== undefined ? "KRW" : undefined,
  };
}

function summarizeArgs(a: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(a)) {
    if (v === undefined || v === null) continue;
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    parts.push(`${k}=${s.length > 80 ? s.slice(0, 77) + "…" : s}`);
  }
  return parts.join(", ");
}

/**
 * Returns an `approveWrite` function for K-MCP servers: resolves true only when a human approved.
 * On rejection / expiry / service error it resolves false (never throws), so the tool reports "not approved".
 */
export function createApprover(o: ApproverOptions): (toolName: string, args: unknown) => Promise<boolean> {
  const client = new ApprovalClient({ baseUrl: o.baseUrl, apiKey: o.apiKey, fetchImpl: o.fetchImpl });
  return async (toolName, args) => {
    if (o.needsApproval && !o.needsApproval(toolName, args)) return true;
    try {
      const req: ApprovalRequest = { ...describeToolCall(toolName, args), source: o.source, ...(o.describe?.(toolName, args) ?? {}) };
      const r = await client.ask(req, { timeoutMs: o.timeoutMs, pollMs: o.pollMs, sleep: o.sleep, onPending: o.onPending });
      return r.status === "approved";
    } catch (e) {
      console.error(`[approval] ${toolName}: ${e instanceof Error ? e.message : e}`);
      return false;
    }
  };
}

/** Read the standard env vars; returns undefined when approval is not configured (writes then run without approval). */
export function approverFromEnv(env: NodeJS.ProcessEnv = process.env, extra: Partial<ApproverOptions> = {}) {
  const baseUrl = env.APPROVAL_URL?.trim(), apiKey = env.APPROVAL_API_KEY?.trim();
  if (!baseUrl || !apiKey) return undefined;
  const timeoutMs = env.APPROVAL_TIMEOUT_SEC ? Number(env.APPROVAL_TIMEOUT_SEC) * 1000 : undefined;
  return createApprover({ baseUrl, apiKey, timeoutMs, source: env.APPROVAL_SOURCE?.trim(), onPending: (r) => { if (r.approveUrl) console.error(`[approval] waiting for a human: ${r.approveUrl}`); }, ...extra });
}
