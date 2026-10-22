import fs from "node:fs";
import path from "node:path";
import type { CheckResult, DriftClass, StatusReport, WatchResult } from "./types.js";

const ORDER: DriftClass[] = ["OK", "DRIFT", "BREAK", "AUTH", "DOWN", "SKIP"];
const ICON: Record<DriftClass, string> = { OK: "✅", DRIFT: "🟡", BREAK: "🔴", AUTH: "🔑", DOWN: "⛔", SKIP: "⚪" };

export function buildReport(mode: "live" | "replay", checks: CheckResult[], watch: WatchResult[]): StatusReport {
  const summary = Object.fromEntries(ORDER.map((k) => [k, 0])) as Record<DriftClass, number>;
  for (const c of checks) summary[c.class]++;
  const kst = new Date(Date.now() + 9 * 3600_000).toISOString().replace("Z", "+09:00");
  return { ranAt: kst, mode, summary, checks, watch };
}

export const needsAlert = (r: StatusReport) => r.checks.some((c) => c.class === "BREAK" || c.class === "AUTH" || c.class === "DOWN");

export function summaryMarkdown(r: StatusReport): string {
  const lines = [`## 🐤 K-MCP canary — ${r.ranAt.slice(0, 16).replace("T", " ")} KST (${r.mode})`, "",
    ORDER.map((k) => `${ICON[k]} ${k} ${r.summary[k]}`).join(" · "), "", "| check | class | ms | note |", "|---|---|---|---|"];
  for (const c of r.checks) lines.push(`| \`${c.id}\` | ${ICON[c.class]} ${c.class} | ${c.ms} | ${(c.note ?? "").replace(/\|/g, "\\|").slice(0, 160)} |`);
  const news = r.watch.filter((w) => w.new.length);
  if (news.length) { lines.push("", "### 변경 감지"); for (const w of news) for (const e of w.new) lines.push(`- **${w.platform}** ${e.date ?? ""} ${e.url ? `[${e.title}](${e.url})` : e.title}`); }
  return lines.join("\n");
}

/** Short KakaoTalk text (≤ ~900 chars): only what needs a human. */
export function kakaoText(r: StatusReport): string {
  const bad = r.checks.filter((c) => ["BREAK", "AUTH", "DOWN"].includes(c.class));
  const head = `🐤 K-MCP 카나리 ${r.ranAt.slice(5, 16).replace("T", " ")}\n✅${r.summary.OK} 🟡${r.summary.DRIFT} 🔴${r.summary.BREAK} 🔑${r.summary.AUTH} ⛔${r.summary.DOWN} ⚪${r.summary.SKIP}`;
  if (!bad.length) return head + "\n모두 정상";
  const body = bad.slice(0, 6).map((c) => `${ICON[c.class]} ${c.id}: ${(c.note ?? "").slice(0, 90)}`).join("\n");
  return `${head}\n${body}${bad.length > 6 ? `\n…외 ${bad.length - 6}건` : ""}`;
}

export function writeStatus(dir: string, r: StatusReport) {
  fs.mkdirSync(dir, { recursive: true });
  const day = r.ranAt.slice(0, 10);
  fs.writeFileSync(path.join(dir, "latest.json"), JSON.stringify(r, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, `${day}.json`), JSON.stringify(r, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "latest.md"), summaryMarkdown(r) + "\n");
}
