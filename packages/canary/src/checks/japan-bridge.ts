import { z } from "zod";
import { tools } from "@appmonster/mcp-japan-bridge";
import type { Check, Ctx } from "../types.js";
import { callTool, byName } from "./_util.js";

const ctxOf = (ctx: Ctx) => ({
  fetchImpl: ctx.fetchImpl, rakutenAppId: ctx.env.RAKUTEN_APP_ID, rakutenAccessKey: ctx.env.RAKUTEN_ACCESS_KEY, rakutenReferer: ctx.env.RAKUTEN_REFERER, yahooAppId: ctx.env.YAHOO_JP_APP_ID,
  defaults: { shippingBaseJpy: Number(ctx.env.BRIDGE_SHIPPING_BASE_JPY ?? 1200), shippingPerKgJpy: Number(ctx.env.BRIDGE_SHIPPING_PER_KG_JPY ?? 900), platformFeeRate: Number(ctx.env.BRIDGE_PLATFORM_FEE_RATE ?? 0.06) },
});

export const checks: Check[] = [
  {
    id: "japan-bridge.searchRakuten", platform: "japan-bridge", access: "read", needs: ["RAKUTEN_APP_ID", "RAKUTEN_ACCESS_KEY"], signup: "https://webservice.rakuten.co.jp/app/create",
    expect: z.object({ total: z.number(), items: z.array(z.object({ itemCode: z.string(), name: z.string(), priceJpy: z.number(), url: z.string() })).min(1) }),
    run: (ctx) => callTool(byName(tools, "jp_search_rakuten"), ctxOf(ctx), { keyword: "ティースプーン", hits: 3 }),
  },
  {
    id: "japan-bridge.searchYahoo", platform: "japan-bridge", access: "read", needs: ["YAHOO_JP_APP_ID"], signup: "https://e.developer.yahoo.co.jp/register",
    expect: z.object({ items: z.array(z.object({ name: z.string(), priceJpy: z.number() })).min(1) }).passthrough(),
    run: (ctx) => callTool(byName(tools, "jp_search_yahoo"), ctxOf(ctx), { query: "ティースプーン", results: 3 }),
  },
  {
    id: "japan-bridge.fxRate", platform: "japan-bridge", access: "read", needs: [],
    expect: z.object({ jpyToKrw: z.number().positive() }).passthrough(),
    run: (ctx) => callTool(byName(tools, "jp_fx_rate"), ctxOf(ctx), {}),
  },
  {
    id: "japan-bridge.landedCost", platform: "japan-bridge", access: "pure", needs: [],
    expect: z.object({ suggestedPriceKrw: z.number().positive(), breakEvenPriceKrw: z.number().positive() }).passthrough(),
    run: (ctx) => callTool(byName(tools, "jp_landed_cost"), ctxOf(ctx), { priceJpy: 3200, weightKg: 0.4, jpyToKrw: 9.1, usdToKrw: 1380, targetMarginRate: 0.25 }),
  },
];
