/**
 * Holidays + business days for 200+ countries. Data: date-holidays (ISC code, CC-BY-3.0 data, © commenthol and contributors).
 * Korea comes from the K-MCP Korean engine. Dates are plain yyyy-MM-dd in the country's own calendar (no time zones).
 */
import Holidays from "date-holidays";
import { KoreaCalendar } from "./kr.js";

export type HolidayType = "public" | "bank" | "school" | "optional" | "observance";
export interface WorldHoliday { date: string; name: string; localName?: string; type: HolidayType; substitute?: boolean }

// 0=Sun … 6=Sat. Default Sat+Sun. Sources: national labour law / government working week.
const WEEKENDS: Record<string, number[]> = {
  SA: [5, 6], KW: [5, 6], QA: [5, 6], BH: [5, 6], OM: [5, 6], EG: [5, 6], JO: [5, 6], IQ: [5, 6], IL: [5, 6], DZ: [5, 6], YE: [5, 6], LY: [5, 6], SY: [5, 6], SD: [5, 6], BD: [5, 6], MV: [5, 6],
  AF: [4, 5], IR: [5], NP: [6],
};
export const weekendOf = (cc: string) => WEEKENDS[cc] ?? [0, 6];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const parse = (s: string) => { const d = new Date(s + "T00:00:00Z"); if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${s}`); return d; };
export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);

const all = new Holidays();
export function countries(): Array<{ code: string; name: string }> {
  const en = all.getCountries("en");
  return Object.entries(en).map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code));
}
export function regions(cc: string): Array<{ code: string; name: string }> {
  const s = all.getStates(cc, "en") ?? {};
  return Object.entries(s).map(([code, name]) => ({ code, name }));
}
export function countryTimezone(cc: string): string | null {
  if (cc === "KR") return "Asia/Seoul";
  try { return new Holidays(cc).getTimezones()?.[0] ?? null; } catch { return null; }
}
export function todayIn(cc: string, now = new Date()): string {
  const tz = countryTimezone(cc) ?? "UTC";
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return p; // en-CA → yyyy-MM-dd
}

export class WorldCalendar {
  readonly cc: string;
  readonly region?: string;
  private hd?: Holidays;
  private hdLocal?: Holidays;
  private kr?: InstanceType<typeof KoreaCalendar>;
  private cache = new Map<number, WorldHoliday[]>();
  readonly weekend: number[];
  constructor(country: string, region?: string, private includeBank = false, extra: Array<{ date: string; name: string }> = []) {
    this.cc = country.toUpperCase();
    this.region = region?.toUpperCase();
    if (this.cc === "KR") this.kr = new KoreaCalendar();
    else {
      if (!all.getCountries()[this.cc]) throw new Error(`Unknown country code "${country}". Use ISO 3166-1 alpha-2 (US, GB, JP, DE…); world_list_countries lists them.`);
      if (this.region && !(all.getStates(this.cc) ?? {})[this.region]) throw new Error(`Unknown region "${region}" for ${this.cc}. Regions: ${regions(this.cc).map((r) => r.code).join(", ") || "none"}`);
      this.hd = new Holidays(this.cc, this.region ?? "", { languages: ["en"] });
      this.hdLocal = new Holidays(this.cc, this.region ?? "");
    }
    this.weekend = weekendOf(this.cc);
    this.extra = new Map(extra.map((e) => [e.date, e.name]));
  }
  private extra: Map<string, string>;

  list(year: number): WorldHoliday[] {
    const hit = this.cache.get(year);
    if (hit) return hit;
    let out: WorldHoliday[];
    if (this.kr) out = this.kr.list(year).map((h) => ({ date: h.date, name: h.name, type: "public" as const, substitute: /대체/.test(h.name) || undefined }));
    else {
      const local = new Map(this.hdLocal!.getHolidays(year).map((h) => [h.date.slice(0, 10) + "|" + h.rule, h.name]));
      out = this.hd!.getHolidays(year).map((h) => {
        const ln = local.get(h.date.slice(0, 10) + "|" + h.rule);
        return { date: h.date.slice(0, 10), name: h.name, ...(ln && ln !== h.name ? { localName: ln } : {}), type: h.type as HolidayType, ...(h.substitute ? { substitute: true } : {}) };
      });
    }
    for (const [date, name] of this.extra) if (date.startsWith(String(year))) out.push({ date, name, type: "public" });
    out.sort((a, b) => a.date.localeCompare(b.date));
    this.cache.set(year, out);
    return out;
  }
  /** Days off: public (and bank, if asked) holidays. */
  dayOff(d: Date): WorldHoliday | null {
    const s = ymd(d);
    return this.list(d.getUTCFullYear()).find((h) => h.date === s && (h.type === "public" || (this.includeBank && h.type === "bank"))) ?? null;
  }
  isWeekend(d: Date) { return this.weekend.includes(d.getUTCDay()); }
  isBusinessDay(d: Date) { return !this.isWeekend(d) && !this.dayOff(d); }
  next(d: Date, step: 1 | -1) { let x = addDays(d, step); for (let i = 0; i < 400 && !this.isBusinessDay(x); i++) x = addDays(x, step); return x; }
  add(d: Date, n: number) {
    const step = n >= 0 ? 1 : -1;
    let x = d, left = Math.abs(n);
    while (left > 0) { x = addDays(x, step); if (this.isBusinessDay(x)) left--; }
    return x;
  }
  count(from: Date, to: Date) {
    const [a, b] = from <= to ? [from, to] : [to, from];
    let n = 0;
    for (let x = a; x <= b; x = addDays(x, 1)) if (this.isBusinessDay(x)) n++;
    return from <= to ? n : -n;
  }
  describeWeekend() { return this.weekend.map((i) => DOW[i]); }
}
