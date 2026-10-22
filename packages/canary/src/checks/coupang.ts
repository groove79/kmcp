import { z } from "zod";
import { CoupangClient, tools } from "@appmonster/mcp-coupang";
import type { Check, Ctx } from "../types.js";
import { callTool, byName } from "./_util.js";

const NEEDS = ["COUPANG_ACCESS_KEY", "COUPANG_SECRET_KEY", "COUPANG_VENDOR_ID"];
const client = (ctx: Ctx) => new CoupangClient({ accessKey: ctx.env.COUPANG_ACCESS_KEY!, secretKey: ctx.env.COUPANG_SECRET_KEY!, vendorId: ctx.env.COUPANG_VENDOR_ID! }, { fetchImpl: ctx.fetchImpl });

export const checks: Check[] = [
  {
    id: "coupang.listProducts", platform: "coupang", access: "read", needs: NEEDS, signup: "https://wing.coupang.com → 추가판매정보 → OPEN API 키",
    expect: z.object({ products: z.array(z.unknown()) }).passthrough(),
    run: (ctx) => callTool(byName(tools, "coupang_list_products"), client(ctx), { maxPerPage: 5 }),
  },
];
