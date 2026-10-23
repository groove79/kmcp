/**
 * Korean business-calendar tools. No network, no keys. Naming: kr_<verb>_<object>. All read-only.
 */
import { z } from "zod";
import { Calendar, hasLunarTable, parse, ymd, type Holiday } from "./holidays.js";
import { deadlinesForYear, RULES, type Entity } from "./deadlines.js";

export type Access = "read" | "write";
export interface ToolDef<S extends z.ZodRawShape> {
  name: string; description: string; access: Access; schema: S;
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

const dateStr = z.string().regex(/^(19|20|21)\d{2}-\d{2}-\d{2}$/, "yyyy-MM-dd between 1900 and 2199").describe("yyyy-MM-dd");
const extraHolidays = z.array(z.object({ date: dateStr, name: z.string().max(100) })).max(500).optional().describe("Additional holidays (e.g. from kr_holidays of the public-data server, or company days off)");
const todayKst = () => { const d = new Date(Date.now() + 9 * 3600_000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`; };
const coverageNote = (y: number) => (hasLunarTable(y) ? undefined : `Lunar holidays (설날·추석·부처님오신날) for ${y} are not tabled — pass extraHolidays from the public-data kr_holidays tool.`);

export const listHolidays = define({
  name: "kr_list_holidays",
  access: "read",
  description:
    "List Korean public holidays for a year including computed 대체공휴일 (substitute holidays) and election days. Offline; lunar dates tabled for 2025–2028. " +
    "연도별 공휴일(대체공휴일 포함)을 반환합니다. Use for scheduling, delivery promises, payroll calendars. Needs year.",
  schema: { year: z.number().int().min(2000).max(2100), extraHolidays },
  handler: async (a) => ({ year: a.year, holidays: new Calendar(a.extraHolidays as Holiday[] | undefined).list(a.year), note: coverageNote(a.year) }),
});

export const isBusinessDay = define({
  name: "kr_is_business_day",
  access: "read",
  description:
    "Tell whether a date is a Korean business day (평일, not a public holiday), and give the next and previous business days. " +
    "해당 날짜가 영업일인지 확인합니다. Use before promising a delivery/meeting date. Needs a date (default today, KST).",
  schema: { date: dateStr.optional(), extraHolidays },
  handler: async (a) => {
    const cal = new Calendar(a.extraHolidays as Holiday[] | undefined);
    const d = parse(a.date ?? todayKst());
    const name = cal.holidayName(d);
    const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
    return { date: ymd(d), dayOfWeek: dow, isBusinessDay: cal.isBusinessDay(d), holiday: name, nextBusinessDay: ymd(cal.nextBusinessDay(d, false)), previousBusinessDay: ymd(cal.prevBusinessDay(d, false)), note: coverageNote(d.getUTCFullYear()) };
  },
});

export const addBusinessDays = define({
  name: "kr_add_business_days",
  access: "read",
  description:
    "Add (or subtract) N Korean business days to a date, skipping weekends and public holidays — e.g. '3 business days after today' for shipping ETAs, or count business days between two dates. " +
    "영업일 기준으로 날짜를 더하거나 두 날짜 사이 영업일 수를 셉니다. Use for 납기·배송·결제 기한 계산. Needs from (default today) and either days or to.",
  schema: { from: dateStr.optional(), days: z.number().int().min(-365).max(365).optional(), to: dateStr.optional(), extraHolidays },
  handler: async (a) => {
    const cal = new Calendar(a.extraHolidays as Holiday[] | undefined);
    const from = parse(a.from ?? todayKst());
    if (a.to) {
      const to = parse(a.to);
      if (Math.abs(to.getTime() - from.getTime()) > 3660 * 86400_000) throw new Error("Range too long: count at most 10 years at a time.");
      return { from: ymd(from), to: ymd(to), businessDays: cal.countBusinessDays(from, to), calendarDays: Math.round((to.getTime() - from.getTime()) / 86400_000) + 1 };
    }
    if (a.days === undefined) throw new Error("Give days (to add) or to (to count).");
    const result = cal.addBusinessDays(from, a.days);
    return { from: ymd(from), days: a.days, result: ymd(result), calendarDays: Math.round((result.getTime() - from.getTime()) / 86400_000) };
  },
});

export const taxCalendar = define({
  name: "kr_tax_calendar",
  access: "read",
  description:
    "Korean tax & payroll filing deadlines for a business profile: VAT (부가세 확정·예정), income/corporate tax, withholding (원천세) and 4대보험 monthly, 지급명세서, 연말정산 — each shifted to the next business day when it falls on a holiday. Filter by month or 'upcoming'. " +
    "사업자 유형별 세무·노무 신고 일정을 반환합니다. Use for '이번 달 신고할 것', reminders, cash planning. Needs entity (individual/simplified/corporation/taxfree); employees true if you pay anyone.",
  schema: {
    year: z.number().int().min(2020).max(2100).optional().describe("Default: current year (KST)"),
    entity: z.enum(["individual", "simplified", "corporation", "taxfree"]).default("individual").describe("individual=개인 일반과세, simplified=간이과세, corporation=법인(12월 결산), taxfree=면세사업자"),
    employees: z.boolean().default(false).describe("true → 원천세·4대보험·지급명세서 포함"),
    withholdingHalfYear: z.boolean().default(false).describe("원천세 반기납부 승인 사업자"),
    month: z.number().int().min(1).max(12).optional(),
    upcomingDays: z.number().int().min(1).max(365).optional().describe("Only deadlines within N days from today (KST)"),
    extraHolidays,
  },
  handler: async (a) => {
    const today = todayKst();
    const year = a.year ?? Number(today.slice(0, 4));
    const cal = new Calendar(a.extraHolidays as Holiday[] | undefined);
    let list = deadlinesForYear(year, { entity: a.entity as Entity, employees: a.employees, withholdingHalfYear: a.withholdingHalfYear, calendar: cal });
    if (a.upcomingDays !== undefined && year === Number(today.slice(0, 4)) + 0) {
      const end = ymd(new Date(parse(today).getTime() + a.upcomingDays * 86400_000));
      list = list.filter((d) => d.date >= today && d.date <= end);
    } else if (a.upcomingDays !== undefined) {
      // next year's deadlines within the window
      const end = ymd(new Date(parse(today).getTime() + a.upcomingDays * 86400_000));
      list = list.filter((d) => d.date >= today && d.date <= end);
    }
    if (a.month) list = list.filter((d) => Number(d.date.slice(5, 7)) === a.month);
    return { year, entity: a.entity, employees: a.employees, today, deadlines: list, note: coverageNote(year) };
  },
});

export const explainRule = define({
  name: "kr_tax_rule",
  access: "read",
  description:
    "Explain one recurring Korean tax/payroll obligation by id (from kr_tax_calendar): what it is, who files, when, and the base dates. " +
    "세무 일정 항목의 설명을 반환합니다. Use when the agent needs to tell the owner what a deadline means. Needs id.",
  schema: { id: z.string().optional().describe("Omit to list all rule ids") },
  handler: async ({ id }) => {
    if (!id) return RULES.map((r) => ({ id: r.id, name: r.name, category: r.category, appliesTo: r.appliesTo, requiresEmployees: !!r.requiresEmployees }));
    const r = RULES.find((x) => x.id === id);
    if (!r) throw new Error(`Unknown rule id: ${id}`);
    return r;
  },
});

export const tools = [listHolidays, isBusinessDay, addBusinessDays, taxCalendar, explainRule] as const;
