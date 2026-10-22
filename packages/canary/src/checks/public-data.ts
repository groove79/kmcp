import { z } from "zod";
import { PublicClient, tools } from "@appmonster/mcp-public-data";
import type { Check, Ctx } from "../types.js";
import { callTool, byName } from "./_util.js";

const client = (ctx: Ctx) => new PublicClient({ dataGoKr: ctx.env.DATA_GO_KR_KEY, juso: ctx.env.JUSO_KEY }, { fetchImpl: ctx.fetchImpl });
const SIGNUP = "https://www.data.go.kr";

export const checks: Check[] = [
  {
    id: "public-data.checkBusiness", platform: "public-data", access: "read", needs: ["DATA_GO_KR_KEY"], signup: SIGNUP,
    expect: z.array(z.object({ b_no: z.string(), status: z.string(), status_code: z.string().nullable() })).min(1),
    run: (ctx) => callTool(byName(tools, "kr_check_business"), client(ctx), { numbers: ["5287300609"] }),
  },
  {
    id: "public-data.holidays", platform: "public-data", access: "read", needs: ["DATA_GO_KR_KEY"], signup: SIGNUP,
    expect: z.object({ holidays: z.array(z.object({ date: z.string(), name: z.string() })) }).passthrough(),
    run: (ctx) => callTool(byName(tools, "kr_holidays"), client(ctx), { year: Number(ctx.today.slice(0, 4)) }),
  },
  {
    id: "public-data.searchAddress", platform: "public-data", access: "read", needs: ["JUSO_KEY"], signup: "https://business.juso.go.kr",
    expect: z.object({ results: z.array(z.object({ roadAddress: z.string(), postalCode: z.string() })) }).passthrough(),
    run: (ctx) => callTool(byName(tools, "kr_search_address"), client(ctx), { keyword: "인천 검단구 완정로34번길 20", count: 3 }),
  },
  {
    id: "public-data.aptTrades", platform: "public-data", access: "read", needs: ["DATA_GO_KR_KEY"], signup: SIGNUP,
    expect: z.object({ trades: z.array(z.unknown()) }).passthrough(),
    run: (ctx) => { const d = new Date(Date.parse(ctx.today) - 35 * 86400_000); return callTool(byName(tools, "kr_apt_trades"), client(ctx), { lawd_cd: "28245", year_month: d.toISOString().slice(0, 7).replace("-", "") }); },
  },
];
