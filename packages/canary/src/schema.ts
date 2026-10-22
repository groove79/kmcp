/**
 * Shape extraction + drift classification.
 * A "shape" is the set of `path → primitive type` pairs of a tool's OUTPUT (what agents read), arrays
 * collapsed to their first element. Comparing today's live shape to the recorded one tells us whether
 * the platform changed something we surface.
 */
import type { z } from "zod";
import type { DriftClass, ShapeDiff } from "./types.js";

export type Shape = Record<string, string>;

export function shapeOf(v: unknown, prefix = "", out: Shape = {}, depth = 0): Shape {
  if (depth > 8) return out;
  if (Array.isArray(v)) {
    out[prefix || "$"] = "array";
    if (v.length) shapeOf(v[0], `${prefix}[]`, out, depth + 1);
    return out;
  }
  if (v !== null && typeof v === "object") {
    if (prefix) out[prefix] = "object";
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) shapeOf(val, prefix ? `${prefix}.${k}` : k, out, depth + 1);
    return out;
  }
  out[prefix || "$"] = v === null ? "null" : typeof v;
  return out;
}

export function diffShape(recorded: Shape, live: Shape): ShapeDiff {
  const removed: string[] = [], added: string[] = [], typeChanged: ShapeDiff["typeChanged"] = [];
  for (const [p, t] of Object.entries(recorded)) {
    if (!(p in live)) removed.push(p);
    else if (live[p] !== t && !(t === "null" || live[p] === "null")) typeChanged.push({ path: p, from: t, to: live[p] });
  }
  for (const p of Object.keys(live)) if (!(p in recorded)) added.push(p);
  return { removed, added, typeChanged };
}

export interface Classified { class: DriftClass; note: string | null }

/** Error → class. Order matters: auth before generic. */
export function classifyError(e: unknown): Classified {
  const msg = e instanceof Error ? e.message : String(e);
  const status = (e as { status?: number })?.status;
  if (status === 401 || status === 403 || /unauthorized|invalid_token|token.*expired|expired.*token|refresh token.*expired|Enter access_token|AUTH/i.test(msg)) return { class: "AUTH", note: msg.slice(0, 300) };
  if ((status && status >= 500) || /ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|timeout|timed out|did not answer|TIMEOUT|fetch failed|503|502|504/i.test(msg)) return { class: "DOWN", note: msg.slice(0, 300) };
  return { class: "BREAK", note: msg.slice(0, 300) };
}

/** Output → class, given the contract and (optionally) the recorded shape. */
export function classifyOutput(out: unknown, expect: z.ZodTypeAny, recordedShape: Shape | null): Classified & { shapeDiff: ShapeDiff | null } {
  const parsed = expect.safeParse(out);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "$"}: ${i.message}`).join("; ");
    return { class: "BREAK", note: `contract: ${issues}`, shapeDiff: null };
  }
  if (!recordedShape) return { class: "OK", note: null, shapeDiff: null };
  const d = diffShape(recordedShape, shapeOf(out));
  // Only paths the contract names are BREAK-worthy; the contract parse above already covered those.
  // Everything else is informational drift.
  if (d.removed.length || d.added.length || d.typeChanged.length) {
    const note = [d.removed.length ? `removed ${d.removed.slice(0, 5).join(", ")}` : "", d.added.length ? `added ${d.added.slice(0, 5).join(", ")}` : "", d.typeChanged.length ? `type ${d.typeChanged.slice(0, 3).map((t) => `${t.path} ${t.from}→${t.to}`).join(", ")}` : ""].filter(Boolean).join(" · ");
    return { class: "DRIFT", note, shapeDiff: d };
  }
  return { class: "OK", note: null, shapeDiff: null };
}
