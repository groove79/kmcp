#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { approverFromEnv } from "@appmonster/approval";
import { createServer } from "./server.js";

const secretKey = process.env.TOSS_SECRET_KEY?.trim();
if (!secretKey || !/^(test|live)_(sk|gsk)_/.test(secretKey)) {
  console.error(
    "Missing or malformed TOSS_SECRET_KEY (expected test_sk_… or live_sk_…).\n" +
      "Get it at https://developers.tosspayments.com → 내 개발정보 → API 키. Start with the test key.",
  );
  process.exit(1);
}
if (secretKey.startsWith("live_")) console.error("[mcp-toss-payments] LIVE key — toss_cancel_payment moves real money. Set APPROVAL_URL to require human approval.");
const server = createServer({ secretKey, approveWrite: approverFromEnv(process.env, { source: "toss-payments" }) });
await server.connect(new StdioServerTransport());
