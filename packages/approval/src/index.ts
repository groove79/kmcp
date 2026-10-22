/**
 * @appmonster/approval — ask a human before an agent does something irreversible.
 *
 *   const approve = createApprover({ baseUrl: "https://okagent.kr", apiKey: "…" });
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

/** Non-2xx from the approval service. `json` is the parsed body when it was JSON (e.g. { error: "quota_exceeded", message, upgradeUrl }). */
export class ApprovalHttpError extends Error {
  readonly json: Record<string, unknown> | null;
  constructor(readonly status: number, readonly body: string) {
    super(`approval service: HTTP ${status} ${body.slice(0, 200)}`);
    this.name = "ApprovalHttpError";
    let j: Record<string, unknown> | null = null;
    try { j = JSON.parse(body) as Record<string, unknown>; } catch { /* not JSON */ }
    this.json = j;
  }
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
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ApprovalHttpError(res.status, body);
    }
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

// ---------------------------------------------------------------------------------------------
// Write gate — what every K-MCP server runs before a write tool.
//
//   OKAGENT_API_KEY set            → "approval": the request goes to OK Agent; the owner approves on KakaoTalk
//                                     (or an auto-approve rule does). Nothing runs until approved.
//   nothing set (default)          → "confirm": nothing runs on the first call. The tool returns a preview and a
//                                     one-time confirm_token; the agent shows the preview to the user in chat and
//                                     calls again with the token once the user agrees.
//   KMCP_WRITE_MODE=direct         → "direct": writes run immediately (scripts / CI you fully trust).
// ---------------------------------------------------------------------------------------------

export const OKAGENT_URL = "https://okagent.kr";
export const CONFIRM_ARG = "confirm_token";
export const CONFIRM_ARG_DESCRIPTION =
  "Leave empty on the first call: the tool then only returns a preview and a token. " +
  "Show the preview to the user, and only after they agree call again with exactly the same arguments plus this token. " +
  "처음엔 비워 두세요. 미리보기를 사용자에게 보여주고 동의를 받은 뒤, 같은 인자에 이 토큰을 넣어 다시 호출합니다.";

export type WriteMode = "approval" | "confirm" | "direct";
export type GateResult = { ok: true } | { ok: false; message: string };
export interface WriteGate {
  readonly mode: WriteMode;
  /** args must NOT contain confirm_token; pass it separately. */
  check(toolName: string, args: Record<string, unknown>, confirmToken?: string): Promise<GateResult>;
}

export interface WriteGateOptions {
  mode?: WriteMode;
  /** approval mode */
  apiKey?: string;
  baseUrl?: string;
  source?: string;
  timeoutMs?: number;
  pollMs?: number;
  describe?: (toolName: string, args: unknown) => Partial<ApprovalRequest>;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  onPending?: (r: ApprovalResult) => void;
  /** confirm mode: token lifetime (ms, default 10 min) */
  confirmTtlMs?: number;
  now?: () => number;
  /** confirm mode: show the one-line OK Agent hint in previews (default true) */
  hint?: boolean;
}

/** Stable JSON (sorted keys) so the same arguments always hash the same. */
export function stableJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`).join(",")}}`;
}

const HINT =
  "\n\n— 채팅을 떠나 있어도 휴대폰 카카오톡으로 승인하려면: https://okagent.kr 에서 무료 키(월 200건)를 받아 OKAGENT_API_KEY 로 넣으세요. " +
  "승인 기록이 남고, 프로는 '재고 변경은 자동 승인' 같은 규칙을 걸 수 있습니다. " +
  "(To approve from your phone instead of this chat, set OKAGENT_API_KEY — free key at okagent.kr.)";

export function createWriteGate(o: WriteGateOptions = {}): WriteGate {
  const mode: WriteMode = o.mode ?? (o.apiKey ? "approval" : "confirm");
  if (mode === "direct") return { mode, check: async () => ({ ok: true }) };

  if (mode === "confirm") {
    const ttl = o.confirmTtlMs ?? 10 * 60_000, now = o.now ?? Date.now;
    const pending = new Map<string, { key: string; exp: number }>();
    return {
      mode,
      async check(toolName, args, token) {
        const key = `${toolName}:${stableJson(args)}`;
        for (const [t, p] of pending) if (p.exp < now()) pending.delete(t);
        if (token) {
          const p = pending.get(token);
          if (p && p.key === key) { pending.delete(token); return { ok: true }; }
        }
        const fresh = randomToken();
        pending.set(fresh, { key, exp: now() + ttl });
        const d = { ...describeToolCall(toolName, args), ...(o.describe?.(toolName, args) ?? {}) };
        const money = d.amount != null ? `\n금액: ${d.amount.toLocaleString("ko-KR")}${d.currency === "KRW" || !d.currency ? "원" : " " + d.currency}` : "";
        const why = token ? "토큰이 맞지 않거나(인자가 바뀌었거나) 만료되어 새로 발급했습니다.\n" : "";
        return {
          ok: false,
          message:
            `확인 필요 — 아직 실행하지 않았습니다. (Not executed yet: needs the user's OK.)\n${why}` +
            `작업: ${d.title} (${toolName})\n내용: ${d.description || "(인자 없음)"}${money}\n\n` +
            `사용자에게 위 내용을 그대로 보여주고, 실행에 동의하면 같은 인자에 ${CONFIRM_ARG}: "${fresh}" 를 더해 다시 호출하세요 (10분 유효). ` +
            `Show this to the user; if they agree, call again with the same arguments plus ${CONFIRM_ARG}: "${fresh}".` +
            (o.hint === false ? "" : HINT),
        };
      },
    };
  }

  // approval mode
  if (!o.apiKey) throw new Error("approval mode needs an API key (OKAGENT_API_KEY)");
  const client = new ApprovalClient({ baseUrl: o.baseUrl ?? OKAGENT_URL, apiKey: o.apiKey, fetchImpl: o.fetchImpl });
  return {
    mode,
    async check(toolName, args) {
      const req: ApprovalRequest = { ...describeToolCall(toolName, args), source: o.source, ...(o.describe?.(toolName, args) ?? {}) };
      try {
        const r = await client.ask(req, { timeoutMs: o.timeoutMs, pollMs: o.pollMs, sleep: o.sleep, onPending: o.onPending });
        if (r.status === "approved") return { ok: true };
        if (r.status === "rejected") return { ok: false, message: `사용자가 카카오톡에서 거부해 실행하지 않았습니다${r.note ? ` (메모: ${r.note})` : ""}. Rejected by the owner — not executed.` };
        return { ok: false, message: `승인 대기 시간이 지나 실행하지 않았습니다. 사용자에게 알리고 필요하면 다시 요청하세요. No decision in time — not executed.` };
      } catch (e) {
        if (e instanceof ApprovalHttpError) {
          const m = typeof e.json?.message === "string" ? e.json.message : "";
          if (e.status === 402) {
            const up = typeof e.json?.upgradeUrl === "string" ? e.json.upgradeUrl : `${OKAGENT_URL}/dashboard`;
            return { ok: false, message: `실행하지 않았습니다: ${m || "OK Agent 이번 달 한도를 다 썼습니다."} 업그레이드: ${up} (OK Agent monthly allowance used up — upgrade to continue.)` };
          }
          if (e.status === 401) return { ok: false, message: `실행하지 않았습니다: OKAGENT_API_KEY 가 맞지 않습니다. ${OKAGENT_URL}/dashboard 에서 키를 확인하세요. (Invalid OKAGENT_API_KEY.)` };
          return { ok: false, message: `실행하지 않았습니다: 승인 서비스 오류 HTTP ${e.status}${m ? ` — ${m}` : ""}. Approval service error — not executed.` };
        }
        return { ok: false, message: `실행하지 않았습니다: 승인 서비스에 연결하지 못했습니다 (${e instanceof Error ? e.message : String(e)}). Could not reach the approval service — not executed.` };
      }
    },
  };
}

function randomToken(): string {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

/**
 * The standard env for every K-MCP server:
 *   OKAGENT_API_KEY (or legacy APPROVAL_API_KEY), OKAGENT_URL (or APPROVAL_URL, default https://okagent.kr),
 *   KMCP_WRITE_MODE = approval | confirm | direct, APPROVAL_TIMEOUT_SEC, APPROVAL_SOURCE.
 */
export function writeGateFromEnv(env: NodeJS.ProcessEnv = process.env, extra: Partial<WriteGateOptions> = {}): WriteGate {
  const apiKey = (env.OKAGENT_API_KEY ?? env.APPROVAL_API_KEY)?.trim() || undefined;
  const baseUrl = (env.OKAGENT_URL ?? env.APPROVAL_URL)?.trim() || OKAGENT_URL;
  const want = env.KMCP_WRITE_MODE?.trim().toLowerCase();
  let mode: WriteMode | undefined = want === "direct" || want === "confirm" || want === "approval" ? want : undefined;
  if (mode === "approval" && !apiKey) { console.error("[kmcp] KMCP_WRITE_MODE=approval but OKAGENT_API_KEY is empty — falling back to in-chat confirmation"); mode = "confirm"; }
  const timeoutMs = env.APPROVAL_TIMEOUT_SEC ? Number(env.APPROVAL_TIMEOUT_SEC) * 1000 : undefined;
  return createWriteGate({
    mode, apiKey, baseUrl, timeoutMs, source: env.APPROVAL_SOURCE?.trim() || extra.source,
    onPending: (r) => { if (r.approveUrl) console.error(`[kmcp] waiting for approval on KakaoTalk: ${r.approveUrl}`); },
    ...extra,
  });
}

/** Wrap a legacy approveWrite hook as a gate (servers that were given approveWrite by a host program). */
export function gateFromApprover(approve: (toolName: string, args: unknown) => Promise<boolean>): WriteGate {
  return { mode: "approval", check: async (t, a) => ((await approve(t, a)) ? { ok: true } : { ok: false, message: `Refused: ${t} was not approved.` }) };
}

/** Split confirm_token off the raw tool arguments. */
export function takeConfirmToken(args: Record<string, unknown>): { args: Record<string, unknown>; token?: string } {
  const { [CONFIRM_ARG]: tok, ...rest } = args ?? {};
  return { args: rest, token: typeof tok === "string" && tok ? tok : undefined };
}
