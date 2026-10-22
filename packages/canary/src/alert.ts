/**
 * Alerts: KakaoTalk "나에게 보내기" through our own kakao package, and one GitHub issue per platform
 * (label canary:<platform>) opened on failure and closed on recovery — via `gh` when GH_TOKEN is present.
 */
import { execFileSync } from "node:child_process";
import type { Ctx, StatusReport } from "./types.js";
import { kakaoText, summaryMarkdown } from "./report.js";
import { kakaoClient } from "./checks/kakao.js";
import { tools } from "@appmonster/mcp-kakao";
import { callTool, byName } from "./checks/_util.js";

export async function sendKakao(ctx: Ctx, r: StatusReport, log = console.error) {
  if (!ctx.env.KAKAO_REST_API_KEY) { log("kakao alert skipped: no KAKAO_REST_API_KEY"); return; }
  try { await callTool(byName(tools, "kakao_send_to_me"), kakaoClient(ctx), { text: kakaoText(r) }); log("kakao alert sent"); }
  catch (e) { log(`kakao alert FAILED: ${(e as Error).message.slice(0, 200)}`); }
}

function gh(args: string[]): string {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function syncIssues(r: StatusReport, repo: string, log = console.error) {
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) { log("issue sync skipped: no GH_TOKEN"); return; }
  const byPlatform = new Map<string, typeof r.checks>();
  for (const c of r.checks) { if (!byPlatform.has(c.platform)) byPlatform.set(c.platform, []); byPlatform.get(c.platform)!.push(c); }
  for (const [platform, checks] of byPlatform) {
    const bad = checks.filter((c) => ["BREAK", "AUTH", "DOWN"].includes(c.class));
    const label = `canary:${platform}`;
    let open: Array<{ number: number }> = [];
    try { open = JSON.parse(gh(["issue", "list", "-R", repo, "--label", label, "--state", "open", "--json", "number"])); } catch (e) { log(`gh list failed (${platform}): ${(e as Error).message.slice(0, 120)}`); continue; }
    if (bad.length) {
      const title = `[canary] ${platform}: ${bad.map((c) => `${c.class} ${c.id.split(".")[1]}`).join(", ")}`;
      const body = `Nightly canary found problems on **${platform}** (${r.ranAt}).\n\n` + bad.map((c) => `- **${c.class}** \`${c.id}\` — ${c.note ?? ""}${c.shapeDiff ? `\n  - removed: ${c.shapeDiff.removed.join(", ") || "—"}\n  - added: ${c.shapeDiff.added.join(", ") || "—"}\n  - type: ${c.shapeDiff.typeChanged.map((t) => `${t.path} ${t.from}→${t.to}`).join(", ") || "—"}` : ""}`).join("\n") + `\n\nAUTH → rotate the key (human). BREAK → fix tool + re-record cassette. DOWN → wait and re-run.\n\n<details><summary>full run</summary>\n\n${summaryMarkdown(r)}\n</details>`;
      try {
        if (open.length) gh(["issue", "comment", "-R", repo, String(open[0].number), "--body", `Still failing on ${r.ranAt}:\n\n` + bad.map((c) => `- ${c.class} \`${c.id}\` — ${c.note ?? ""}`).join("\n")]);
        else { try { gh(["label", "create", "-R", repo, label, "--color", "D93F0B", "--force"]); } catch { /* exists */ } gh(["issue", "create", "-R", repo, "--title", title, "--body", body, "--label", label]); }
        log(`issue ${open.length ? "updated" : "opened"}: ${platform}`);
      } catch (e) { log(`gh issue failed (${platform}): ${(e as Error).message.slice(0, 120)}`); }
    } else if (open.length) {
      try { gh(["issue", "close", "-R", repo, String(open[0].number), "--comment", `Recovered on ${r.ranAt} — all ${platform} checks OK.`]); log(`issue closed: ${platform}`); } catch (e) { log(`gh close failed: ${(e as Error).message.slice(0, 120)}`); }
    }
  }
}
