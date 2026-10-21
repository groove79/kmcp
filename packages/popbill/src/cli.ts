#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { approverFromEnv } from "@appmonster/approval";
import { createServer } from "./server.js";

const env = (k: string) => process.env[k]?.trim();
const linkId = env("POPBILL_LINK_ID");
const secretKey = env("POPBILL_SECRET_KEY");
const corpNum = env("POPBILL_CORP_NUM")?.replace(/\D/g, "");
if (!linkId || !secretKey || !corpNum || corpNum.length !== 10) {
  console.error(
    "Missing POPBILL_LINK_ID / POPBILL_SECRET_KEY / POPBILL_CORP_NUM (10 digits).\n" +
      "Get LinkID + SecretKey at https://developers.popbill.com (API 연동 신청), join your business at https://www.popbill.com. " +
      "POPBILL_TEST=true (default) uses the test server.",
  );
  process.exit(1);
}
const isTest = env("POPBILL_TEST") !== "false";
if (!isTest) console.error("[mcp-popbill] LIVE server — issued invoices go to the NTS and 알림톡 reaches real phones. Set APPROVAL_URL to require human approval.");
const server = createServer({
  linkId, secretKey, corpNum, userId: env("POPBILL_USER_ID"), isTest,
  ipRestrict: env("POPBILL_IP_RESTRICT") === undefined ? undefined : env("POPBILL_IP_RESTRICT") !== "false",
  approveWrite: approverFromEnv(process.env, { source: "popbill" }),
});
await server.connect(new StdioServerTransport());
