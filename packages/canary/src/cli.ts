#!/usr/bin/env node
/**
 *  canary run [--live|--replay] [--platform <p>] [--status-dir <dir>] [--alert]   nightly / CI entry
 *  canary record [<platform>|all]                                                  re-record cassettes with real creds
 *  canary watch                                                                    change-watch only
 *
 * Env: static keys (GitHub Secrets or /Volumes/Dev/.secrets/*.env), CANARY_DATABASE_URL (Neon, rotating tokens),
 *      CANARY_REPO (owner/repo for issues, default groove79/kmcp), GH_TOKEN (issues), KAKAO_* (alerts).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allChecks } from "./checks/index.js";
import { runChecks } from "./run.js";
import { buildReport, needsAlert, summaryMarkdown, writeStatus } from "./report.js";
import { loadLocalEnv, makeTokenBag } from "./secrets.js";
import { runWatch } from "./watch/run.js";
import { sendKakao, syncIssues } from "./alert.js";
import { kstToday } from "./checks/_util.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(here, "..");
const args = process.argv.slice(2);
const cmd = args[0] ?? "run";
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const log = (s: string) => console.error(s);

const loaded = loadLocalEnv();
if (loaded.length) log(`loaded ${loaded.length} local secrets`);
const env = process.env;
const cassetteDir = path.join(PKG, "cassettes");
const snapshotDir = path.join(PKG, "snapshots", "watch");
const statusDir = opt("status-dir") ?? path.join(PKG, "status");
const platform = opt("platform") ?? (cmd === "record" ? args[1] : undefined);
const only = platform && platform !== "all" ? (c: { platform: string }) => c.platform === platform : undefined;

async function main() {
  const tokens = await makeTokenBag(env, []);
  try {
    if (cmd === "watch") {
      const w = await runWatch(snapshotDir, fetch, log);
      console.log(JSON.stringify(w, null, 2));
      return;
    }
    if (cmd === "record") {
      env.CANARY_LIVE = "1";
      const r = await runChecks(allChecks, { mode: "record", cassetteDir, env, tokens, only, log });
      const bad = r.filter((x) => ["BREAK", "AUTH", "DOWN"].includes(x.class));
      log(`recorded ${r.filter((x) => x.note?.includes("recorded")).length} cassettes; ${bad.length} failed`);
      process.exitCode = bad.length ? 1 : 0;
      return;
    }
    // run
    const mode: "live" | "replay" = flag("replay") ? "replay" : "live";
    if (mode === "live") env.CANARY_LIVE = "1";
    const checks = await runChecks(allChecks, { mode, cassetteDir, env, tokens, only, log });
    const watch = mode === "live" && !platform ? await runWatch(snapshotDir, fetch, log) : [];
    const report = buildReport(mode, checks, watch);
    writeStatus(statusDir, report);
    console.log(summaryMarkdown(report));
    if (flag("alert") && mode === "live") {
      const ctx = { fetchImpl: fetch, env, tokens, mode: "live" as const, today: kstToday() };
      if (needsAlert(report) || flag("always-alert")) await sendKakao(ctx, report, log); else log("no alert needed (kakao.sendToMe already proved the channel)");
      syncIssues(report, env.CANARY_REPO ?? "groove79/kmcp", log);
    }
    // replay (CI) fails the job on BREAK; live never fails the workflow (the report is the product)
    if (mode === "replay" && checks.some((c) => c.class === "BREAK")) process.exitCode = 1;
  } finally {
    await (tokens as { close?: () => Promise<void> }).close?.();
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
