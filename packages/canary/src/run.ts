import path from "node:path";
import fs from "node:fs";
import type { Check, CheckResult, Ctx, DriftClass, TokenBag } from "./types.js";
import { cassettePath, loadCassette, recordingFetch, replayFetch, saveCassette, type Exchange, ReplayMiss } from "./recorder.js";
import { classifyError, classifyOutput, shapeOf, type Shape } from "./schema.js";
import { kstToday } from "./checks/_util.js";

export interface RunOptions {
  mode: "live" | "replay" | "record";
  cassetteDir: string;
  env: NodeJS.ProcessEnv;
  tokens: TokenBag;
  only?: (c: Check) => boolean;
  log?: (s: string) => void;
}

const withTimeout = <T>(p: Promise<T>, ms: number, what: string) => new Promise<T>((res, rej) => {
  const t = setTimeout(() => rej(new Error(`timeout after ${ms}ms (${what})`)), ms);
  p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
});

function recordedShape(file: string): Shape | null {
  try { const j = JSON.parse(fs.readFileSync(file + ".shape.json", "utf8")); return j as Shape; } catch { return null; }
}

export async function runChecks(checks: Check[], o: RunOptions): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const log = o.log ?? (() => {});
  const today = kstToday();
  for (const c of checks) {
    if (o.only && !o.only(c)) continue;
    const missing = c.needs.filter((n) => !o.env[n]);
    const file = cassettePath(o.cassetteDir, c.id);
    const t0 = Date.now();
    if (missing.length) {
      results.push({ id: c.id, platform: c.platform, access: c.access, class: "SKIP", ms: 0, note: `needs ${missing.join(", ")}${c.signup ? ` — ${c.signup}` : ""}` });
      log(`SKIP  ${c.id} (${missing.join(", ")})`); continue;
    }
    if (o.mode === "replay" && c.access !== "pure" && !loadCassette(file)) {
      results.push({ id: c.id, platform: c.platform, access: c.access, class: "SKIP", ms: 0, note: "no cassette — run `canary record`" });
      log(`SKIP  ${c.id} (no cassette)`); continue;
    }
    const sink: Exchange[] = [];
    const fetchImpl = o.mode === "replay" && c.access !== "pure" ? replayFetch(loadCassette(file)!) : o.mode === "record" ? recordingFetch(fetch, sink) : fetch;
    const ctx: Ctx = { fetchImpl, env: o.env, tokens: o.tokens, mode: o.mode === "replay" ? "replay" : "live", today };
    let out: unknown; let cls: DriftClass; let note: string | null = null; let shapeDiff = null;
    try {
      out = await withTimeout(c.run(ctx), c.timeoutMs ?? 30_000, c.id);
      const r = classifyOutput(out, c.expect, o.mode === "replay" ? null : recordedShape(file));
      cls = r.class; note = r.note; shapeDiff = r.shapeDiff;
    } catch (e) {
      const r = e instanceof ReplayMiss ? { class: "BREAK" as DriftClass, note: e.message } : classifyError(e);
      cls = r.class; note = r.note;
    }
    if (c.knownIssue && (cls === "DOWN" || cls === "BREAK")) { cls = "DRIFT"; note = `known issue: ${c.knownIssue}${note ? " · " + note : ""}`; }
    if (c.revert && out !== undefined) {
      try { await withTimeout(c.revert(ctx, out), c.timeoutMs ?? 30_000, c.id + " revert"); }
      catch (e) { note = `${note ? note + " · " : ""}REVERT FAILED: ${(e as Error).message.slice(0, 200)}`; if (cls === "OK") cls = "DRIFT"; }
    }
    if (o.mode === "record" && cls !== "BREAK" && cls !== "AUTH" && cls !== "DOWN") {
      saveCassette(file, { recordedAt: new Date().toISOString(), exchanges: sink });
      fs.writeFileSync(file + ".shape.json", JSON.stringify(shapeOf(out), null, 2) + "\n");
      note = `${note ? note + " · " : ""}recorded ${sink.length} exchanges`;
    }
    results.push({ id: c.id, platform: c.platform, access: c.access, class: cls, ms: Date.now() - t0, note, shapeDiff });
    log(`${cls.padEnd(5)} ${c.id} ${Date.now() - t0}ms${note ? " — " + note : ""}`);
  }
  return results;
}

export { path };
