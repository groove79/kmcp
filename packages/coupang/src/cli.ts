#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { approverFromEnv } from "@appmonster/approval";
import { createServer } from "./server.js";

const accessKey = process.env.COUPANG_ACCESS_KEY?.trim();
const secretKey = process.env.COUPANG_SECRET_KEY?.trim();
const vendorId = process.env.COUPANG_VENDOR_ID?.trim();
if (!accessKey || !secretKey || !vendorId) {
  console.error(
    "Missing COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY / COUPANG_VENDOR_ID.\n" +
      "Wing → 판매자정보 → 추가판매정보 → OPEN API 키 발급 (https://wing.coupang.com). vendorId looks like A00012345.",
  );
  process.exit(1);
}
const server = createServer({ accessKey, secretKey, vendorId, approveWrite: approverFromEnv(process.env, { source: "coupang" }) });
await server.connect(new StdioServerTransport());
