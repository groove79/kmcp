#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const clientId = process.env.DELIVERY_TRACKER_CLIENT_ID?.trim();
const clientSecret = process.env.DELIVERY_TRACKER_CLIENT_SECRET?.trim();
if (!clientId || !clientSecret) {
  console.error(
    "Missing DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET.\n" +
      "Free credentials: https://console.tracker.delivery → Create Project → Credentials → Create (Google or email sign-in, 1 minute).",
  );
  process.exit(1);
}
await createServer({ clientId, clientSecret }).connect(new StdioServerTransport());
