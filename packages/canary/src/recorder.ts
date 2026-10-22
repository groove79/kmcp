/**
 * Record / replay fetch.
 *
 * A cassette is one JSON file per check: an ordered list of { key, req, res }. The key is
 * `METHOD path?sorted-query` with volatile/credential params removed, plus a short hash of the request
 * body with secrets masked. Replay matches by key (first unused match wins, so repeated identical calls
 * replay in order). Everything written is passed through mask.ts first.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { maskDeep, maskUrl, maskValue, MASKED_HEADERS, VOLATILE_QUERY } from "./mask.js";

export interface Exchange {
  key: string;
  req: { method: string; url: string; bodyHash: string | null; bodyPreview?: unknown };
  res: { status: number; headers: Record<string, string>; body: unknown; bodyIsText?: boolean };
}
export interface Cassette { recordedAt: string; exchanges: Exchange[] }

export function cassettePath(dir: string, checkId: string) {
  const [platform, ...rest] = checkId.split(".");
  return path.join(dir, platform, `${rest.join(".") || "default"}.json`);
}

function bodyToString(body: BodyInit | null | undefined): string | null {
  if (body == null) return null;
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof FormData) {
    const parts: string[] = [];
    body.forEach((v, k) => parts.push(`${k}=${typeof v === "string" ? v : `<file ${(v as File).name} ${(v as File).size}b>`}`));
    return parts.join("&");
  }
  return "<binary>";
}

export function requestKey(method: string, url: string, bodyStr: string | null): string {
  const u = new URL(url);
  const q = [...u.searchParams.entries()].filter(([k]) => !VOLATILE_QUERY.has(k)).sort(([a], [b]) => a.localeCompare(b));
  const qs = q.map(([k, v]) => `${k}=${v}`).join("&");
  // strip credential-ish params from form bodies before hashing so the key is stable across token rotation
  let b = bodyStr;
  if (b && /(^|&)(client_secret_sign|refresh_token|access_token|timestamp|code)=/.test(b)) {
    b = b.split("&").filter((p) => !/^(client_secret_sign|refresh_token|access_token|timestamp|code)=/.test(p)).join("&");
  }
  const h = b == null ? null : createHash("sha1").update(b).digest("hex").slice(0, 10);
  return `${method.toUpperCase()} ${u.origin}${u.pathname}${qs ? "?" + qs : ""}${h ? " #" + h : ""}`;
}

function parseBody(text: string, contentType: string | null): { body: unknown; bodyIsText: boolean } {
  if (contentType?.includes("json")) { try { return { body: JSON.parse(text), bodyIsText: false }; } catch { /* fallthrough */ } }
  return { body: text.length > 20_000 ? text.slice(0, 20_000) + "…[truncated]" : text, bodyIsText: true };
}

export function recordingFetch(real: typeof fetch, sink: Exchange[]): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const bodyStr = bodyToString(init?.body as BodyInit | null | undefined);
    const res = await real(input, init);
    const text = await res.clone().text();
    const ct = res.headers.get("content-type");
    const { body, bodyIsText } = parseBody(text, ct);
    const headers: Record<string, string> = {};
    for (const h of MASKED_HEADERS) { const v = res.headers.get(h); if (v) headers[h] = v; }
    let bodyPreview: unknown = undefined;
    if (bodyStr && bodyStr !== "<binary>") {
      try { bodyPreview = maskDeep(JSON.parse(bodyStr)); } catch { bodyPreview = maskValue(bodyStr).slice(0, 500); }
    }
    sink.push({
      key: requestKey(method, url, bodyStr),
      req: { method, url: maskUrl(url), bodyHash: requestKey(method, url, bodyStr).split(" #")[1] ?? null, bodyPreview },
      res: { status: res.status, headers, body: bodyIsText ? maskValue(body as string) : maskDeep(body), bodyIsText },
    });
    return res;
  }) as typeof fetch;
}

export class ReplayMiss extends Error {
  constructor(public readonly key: string) { super(`No cassette exchange for ${key} — re-record with: pnpm canary record <platform>`); this.name = "ReplayMiss"; }
}

export function replayFetch(cassette: Cassette): typeof fetch {
  const used = new Set<number>();
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const key = requestKey(method, url, bodyToString(init?.body as BodyInit | null | undefined));
    let idx = cassette.exchanges.findIndex((e, i) => !used.has(i) && e.key === key);
    if (idx < 0) idx = cassette.exchanges.findIndex((e, i) => !used.has(i) && e.key.split(" #")[0] === key.split(" #")[0]); // body changed (e.g. dated name) → path match
    if (idx < 0) throw new ReplayMiss(key);
    used.add(idx);
    const ex = cassette.exchanges[idx];
    const text = ex.res.bodyIsText ? String(ex.res.body) : JSON.stringify(ex.res.body);
    return new Response(text, { status: ex.res.status, headers: ex.res.headers });
  }) as typeof fetch;
}

export function loadCassette(file: string): Cassette | null {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as Cassette; } catch { return null; }
}
export function saveCassette(file: string, c: Cassette) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(c, null, 2) + "\n");
}
