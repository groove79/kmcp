import { z } from "zod";
import { sdkServices, tools } from "@appmonster/mcp-popbill";
import type { Check, Ctx } from "../types.js";
import { callTool, byName } from "./_util.js";

const NEEDS = ["POPBILL_LINK_ID", "POPBILL_SECRET_KEY", "POPBILL_CORP_NUM"];
// The Popbill SDK uses its own HTTP client, so this check is live-only (no cassette); replay marks it SKIP.
const services = (ctx: Ctx) => sdkServices({ linkId: ctx.env.POPBILL_LINK_ID!, secretKey: ctx.env.POPBILL_SECRET_KEY!, corpNum: ctx.env.POPBILL_CORP_NUM!, isTest: true, ipRestrict: false } as never);

export const checks: Check[] = [
  {
    id: "popbill.checkAccount", platform: "popbill", access: "read", needs: [...NEEDS, "CANARY_LIVE"], signup: "https://developers.popbill.com (API 연동신청 → 테스트 LinkID)",
    expect: z.object({ isMember: z.boolean(), balancePoints: z.unknown() }).passthrough(),
    run: async (ctx) => callTool(byName(tools, "popbill_check_account"), await services(ctx), {}),
  },
];
