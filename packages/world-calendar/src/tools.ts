/**
 * World holiday / business-day tools. Offline, no keys. Naming: world_<verb>_<object>. All read-only.
 */
import { z } from "zod";
import { WorldCalendar, countries, regions, parse, ymd, todayIn } from "./engine.js";

export type Access = "read" | "write";
export interface ToolDef<S extends z.ZodRawShape> {
  name: string; description: string; access: Access; schema: S;
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

const dateStr = z.string().regex(/^(19|20|21)\d{2}-\d{2}-\d{2}$/, "yyyy-MM-dd between 1900 and 2199").describe("yyyy-MM-dd");
const country = z.string().regex(/^[A-Za-z]{2}$/).describe("ISO 3166-1 alpha-2 country code, e.g. US, GB, DE, JP, IN, AE");
const region = z.string().max(10).optional().describe("Optional state/region code, e.g. CA (California) for US, BY (Bavaria) for DE. Regional holidays differ.");
const includeBank = z.boolean().default(false).describe("Also treat bank holidays as days off (default: public holidays only)");
const extraHolidays = z.array(z.object({ date: dateStr, name: z.string().max(100) })).max(500).optional().describe("Company days off to treat as holidays");
const DATA = "Holiday data: date-holidays (CC-BY-3.0); Korea: K-MCP engine.";

const cal = (a: { country: string; region?: string; includeBank?: boolean; extraHolidays?: Array<{ date: string; name: string }> }) =>
  new WorldCalendar(a.country, a.region, a.includeBank ?? false, a.extraHolidays ?? []);

export const listHolidays = define({
  name: "world_list_holidays",
  access: "read",
  description:
    "List public holidays of a country (and optionally a state/region) for a year, with English and local names and substitute (observed) days. 200+ countries. " +
    "Use for scheduling across countries, shipping cut-offs, payroll or market-closed days. Set types to include bank/optional/observance days.",
  schema: {
    country, region,
    year: z.number().int().min(1970).max(2100),
    types: z.array(z.enum(["public", "bank", "school", "optional", "observance"])).default(["public"]),
  },
  handler: async (a) => {
    const c = cal(a);
    const list = c.list(a.year).filter((h) => a.types.includes(h.type));
    return { country: c.cc, region: c.region ?? null, year: a.year, weekend: c.describeWeekend(), count: list.length, holidays: list, source: DATA };
  },
});

export const isBusinessDay = define({
  name: "world_is_business_day",
  access: "read",
  description:
    "Tell whether a date is a working day in a country (not a weekend there, not a public holiday), and give the next and previous working days. " +
    "Knows local weekends (Friday–Saturday in Saudi Arabia, Israel, Egypt…). Default date is today in that country.",
  schema: { country, region, date: dateStr.optional(), includeBank, extraHolidays },
  handler: async (a) => {
    const c = cal(a);
    const d = parse(a.date ?? todayIn(c.cc));
    const off = c.dayOff(d);
    return {
      country: c.cc, region: c.region ?? null, date: ymd(d), dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()],
      isBusinessDay: c.isBusinessDay(d), isWeekend: c.isWeekend(d), holiday: off ? off.name : null,
      nextBusinessDay: ymd(c.next(d, 1)), previousBusinessDay: ymd(c.next(d, -1)), weekend: c.describeWeekend(),
    };
  },
});

export const addBusinessDays = define({
  name: "world_add_business_days",
  access: "read",
  description:
    "Add or subtract N working days in a country (skipping its weekends and public holidays), or count working days between two dates. " +
    "Use for delivery ETAs, contract or payment deadlines, SLA due dates. Needs country, from (default today there) and either days or to.",
  schema: { country, region, from: dateStr.optional(), days: z.number().int().min(-730).max(730).optional(), to: dateStr.optional(), includeBank, extraHolidays },
  handler: async (a) => {
    const c = cal(a);
    const from = parse(a.from ?? todayIn(c.cc));
    if (a.to) {
      const to = parse(a.to);
      if (Math.abs(to.getTime() - from.getTime()) > 3660 * 86400_000) throw new Error("Range too long: count at most 10 years at a time.");
      return { country: c.cc, region: c.region ?? null, from: ymd(from), to: ymd(to), businessDays: c.count(from, to), calendarDays: Math.round((to.getTime() - from.getTime()) / 86400_000) + 1, note: "Both ends inclusive." };
    }
    if (a.days === undefined) throw new Error("Give either days (number of working days to add) or to (end date to count to).");
    const r = c.add(from, a.days);
    const skipped = c.list(from.getUTCFullYear()).concat(r.getUTCFullYear() !== from.getUTCFullYear() ? c.list(r.getUTCFullYear()) : [])
      .filter((h) => h.date > ymd(a.days! >= 0 ? from : r) && h.date <= ymd(a.days! >= 0 ? r : from) && c.dayOff(parse(h.date)));
    return { country: c.cc, region: c.region ?? null, from: ymd(from), days: a.days, result: ymd(r), holidaysSkipped: skipped.map((h) => ({ date: h.date, name: h.name })) };
  },
});

export const compareCountries = define({
  name: "world_common_business_days",
  access: "read",
  description:
    "Find dates that are working days in ALL of several countries (e.g. US, DE and JP teams), between two dates — for meetings, settlements or launches across borders. Max 10 countries, 92 days.",
  schema: {
    countries: z.array(country).min(2).max(10),
    from: dateStr, to: dateStr,
  },
  handler: async (a) => {
    const from = parse(a.from), to = parse(a.to);
    if (to < from || (to.getTime() - from.getTime()) / 86400_000 > 92) throw new Error("from must be before to, at most 92 days apart.");
    const cals = a.countries.map((cc) => new WorldCalendar(cc));
    const common: string[] = [];
    const blocked: Array<{ date: string; closed: Array<{ country: string; reason: string }> }> = [];
    for (let x = from; x <= to; x = new Date(x.getTime() + 86400_000)) {
      const closed = cals.filter((c) => !c.isBusinessDay(x)).map((c) => ({ country: c.cc, reason: c.isWeekend(x) ? "weekend" : c.dayOff(x)!.name }));
      if (!closed.length) common.push(ymd(x));
      else if (closed.some((z) => z.reason !== "weekend")) blocked.push({ date: ymd(x), closed });
    }
    return { countries: cals.map((c) => c.cc), from: ymd(from), to: ymd(to), commonBusinessDays: common, holidayConflicts: blocked };
  },
});

export const listCountries = define({
  name: "world_list_countries",
  access: "read",
  description: "List supported country codes (200+) or, with country, its state/region codes for regional holidays.",
  schema: { country: country.optional(), search: z.string().max(40).optional() },
  handler: async (a) => {
    if (a.country) return { country: a.country.toUpperCase(), regions: regions(a.country.toUpperCase()) };
    const q = a.search?.toLowerCase();
    const list = countries().filter((c) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q);
    return { count: list.length, countries: list };
  },
});

export const tools = [listHolidays, isBusinessDay, addBusinessDays, compareCountries, listCountries] as const;
