#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const env = (k: string) => process.env[k]?.trim();
const num = (k: string) => (env(k) ? Number(env(k)) : undefined);
if (!env("RAKUTEN_APP_ID") && !env("YAHOO_JP_APP_ID")) {
  console.error("No RAKUTEN_APP_ID / YAHOO_JP_APP_ID set — search tools will explain how to get free keys; jp_fx_rate, jp_landed_cost and jp_listing_draft work without keys.");
}
const server = createServer({
  rakutenAppId: env("RAKUTEN_APP_ID"), rakutenAccessKey: env("RAKUTEN_ACCESS_KEY"), yahooAppId: env("YAHOO_JP_APP_ID"),
  shippingBaseJpy: num("BRIDGE_SHIPPING_BASE_JPY"), shippingPerKgJpy: num("BRIDGE_SHIPPING_PER_KG_JPY"), platformFeeRate: num("BRIDGE_PLATFORM_FEE_RATE"),
});
await server.connect(new StdioServerTransport());
