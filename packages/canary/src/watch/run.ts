import fs from "node:fs";
import path from "node:path";
import type { WatchEntry, WatchResult } from "../types.js";
import { sources } from "./sources.js";

const ALERT_WORDS = /deprecat|종료|폐지|중단|필수|변경 안내|breaking|sunset|retire/i;

export async function runWatch(snapshotDir: string, fetchImpl: typeof fetch = fetch, log: (s: string) => void = () => {}): Promise<WatchResult[]> {
  fs.mkdirSync(snapshotDir, { recursive: true });
  const results: WatchResult[] = [];
  for (const s of sources) {
    const file = path.join(snapshotDir, `${s.platform}.json`);
    let prev: WatchEntry[] = []; try { prev = JSON.parse(fs.readFileSync(file, "utf8")).entries; } catch { /* first run */ }
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20_000);
      const res = await fetchImpl(s.url, { signal: ctl.signal, headers: { "User-Agent": "kmcp-canary/0.1 (+https://github.com/groove79/kmcp)" } });
      clearTimeout(t);
      if (!res.ok) { results.push({ platform: s.platform, source: s.url, ok: false, new: [], note: `HTTP ${res.status}` }); log(`watch ${s.platform}: HTTP ${res.status}`); continue; }
      const entries = s.extract(await res.text(), s.url).filter((e) => e.title);
      const seen = new Set(prev.map((e) => e.title + "|" + (e.url ?? "")));
      const fresh = prev.length ? entries.filter((e) => !seen.has(e.title + "|" + (e.url ?? ""))) : [];
      const note = fresh.some((e) => ALERT_WORDS.test(e.title)) ? "⚠ contains deprecation/termination wording" : entries.length ? undefined : "extractor found 0 entries (layout changed?)";
      results.push({ platform: s.platform, source: s.url, ok: entries.length > 0, new: fresh, note });
      fs.writeFileSync(file, JSON.stringify({ checkedAt: new Date().toISOString(), entries }, null, 2) + "\n");
      log(`watch ${s.platform}: ${entries.length} entries, ${fresh.length} new${note ? " — " + note : ""}`);
    } catch (e) {
      results.push({ platform: s.platform, source: s.url, ok: false, new: [], note: (e as Error).message.slice(0, 120) });
      log(`watch ${s.platform}: ${(e as Error).message.slice(0, 120)}`);
    }
  }
  return results;
}
