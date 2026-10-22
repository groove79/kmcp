import { z } from "zod";
import { TossClient, tools } from "@appmonster/mcp-toss-payments";
import type { Check, Ctx } from "../types.js";
import { callTool, byName } from "./_util.js";

const NEEDS = ["TOSS_SECRET_KEY"];
const client = (ctx: Ctx) => new TossClient(ctx.env.TOSS_SECRET_KEY!, { fetchImpl: ctx.fetchImpl });
const daysAgo = (today: string, n: number) => new Date(Date.parse(today) - n * 86400_000).toISOString().slice(0, 10);

export const checks: Check[] = [
  {
    id: "toss-payments.listSettlements", platform: "toss-payments", access: "read", needs: NEEDS,
    expect: z.object({ settlements: z.array(z.unknown()), totalPayOut: z.number(), hasMore: z.boolean() }),
    run: (ctx) => callTool(byName(tools, "toss_list_settlements"), client(ctx), { startDate: daysAgo(ctx.today, 7), endDate: ctx.today }),
  },
  {
    id: "toss-payments.listTransactions", platform: "toss-payments", access: "read", needs: NEEDS,
    expect: z.object({ transactions: z.array(z.unknown()), startDate: z.string(), notes: z.array(z.string()) }),
    timeoutMs: 45_000, // the client itself gives up after 20s with TIMEOUT
    knownIssue: "Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available.",
    run: (ctx) => callTool(byName(tools, "toss_list_transactions"), client(ctx), { startDate: daysAgo(ctx.today, 2), endDate: ctx.today, limit: 10 }),
  },
  {
    id: "toss-payments.getPaymentNotFound", platform: "toss-payments", access: "read", needs: NEEDS,
    // a known-missing key must come back as a clean NOT_FOUND error, not a crash or a 5xx
    expect: z.object({ code: z.string(), status: z.number() }),
    run: async (ctx) => {
      try { await callTool(byName(tools, "toss_get_payment"), client(ctx), { paymentKey: "kmcp_canary_missing" }); return { code: "UNEXPECTED_SUCCESS", status: 200 }; }
      catch (e) { const err = e as { code?: string; status?: number }; if (err.status === 404) return { code: err.code ?? "NOT_FOUND", status: 404 }; throw e; }
    },
  },
];
