import { z } from "zod";
import { tools } from "@appmonster/mcp-kr-biz-calendar";
import type { Check } from "../types.js";

const call = async (name: string, args: Record<string, unknown>) => {
  const t = tools.find((x) => x.name === name)!;
  return (t.handler as (a: unknown) => Promise<unknown>)(z.object(t.schema).parse(args));
};

export const checks: Check[] = [
  { id: "kr-biz-calendar.isBusinessDay", platform: "kr-biz-calendar", access: "pure", needs: [], expect: z.object({ isBusinessDay: z.boolean(), nextBusinessDay: z.string() }).passthrough(), run: (ctx) => call("kr_is_business_day", { date: ctx.today }) },
  { id: "kr-biz-calendar.taxCalendar", platform: "kr-biz-calendar", access: "pure", needs: [], expect: z.object({ deadlines: z.array(z.object({ id: z.string(), date: z.string() })) }).passthrough(), run: (ctx) => call("kr_tax_calendar", { year: Number(ctx.today.slice(0, 4)), entity: "individual", employees: true, withholdingHalfYear: false, month: Number(ctx.today.slice(5, 7)) }) },
];
