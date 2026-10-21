#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const clientId = process.env.NAVER_COMMERCE_CLIENT_ID;
const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error(
    "Missing NAVER_COMMERCE_CLIENT_ID / NAVER_COMMERCE_CLIENT_SECRET.\n" +
      "Create an application at https://apicenter.commerce.naver.com and put the id/secret in your MCP client config env.",
  );
  process.exit(1);
}

const server = createServer({
  clientId,
  clientSecret,
  type: (process.env.NAVER_COMMERCE_TYPE as "SELF" | "SELLER") ?? "SELF",
  accountId: process.env.NAVER_COMMERCE_ACCOUNT_ID,
});

const transport = new StdioServerTransport();
await server.connect(transport);
