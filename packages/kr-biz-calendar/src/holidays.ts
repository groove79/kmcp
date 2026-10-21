/**
 * Korean public holidays. Fixed-date holidays are generated; lunar ones (설날·추석·부처님오신날) are tabled per year
 * because the lunar calendar needs a lookup. 대체공휴일 (substitute holidays) are computed per the 2023+ rules:
 * every public holiday that falls on a Saturday/Sunday (or on another holiday) is substituted by the next
 * non-holiday weekday — except 1월 1일 and 현충일, which have no substitute.
 *
 * Years covered by the lunar table: 2025–2028. For other years the fixed holidays still work; callers should
 * pass `extraHolidays` (e.g. from the public-data server's kr_holidays) for authoritative data.
 */

export interface Holiday { date: string; name: string; substitute?: boolean }

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const parse = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Date must be yyyy-MM-dd: ${s}`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
};
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);
const dow = (d: Date) => d.getUTCDay(); // 0 Sun … 6 Sat
export const isWeekend = (d: Date) => dow(d) === 0 || dow(d) === 6;

/** Lunar-based holidays (Gregorian dates) — 설날 3 days, 부처님오신날, 추석 3 days. */
const LUNAR: Record<number, Array<[string, string]>> = {
  2025: [["01-28", "설날 연휴"], ["01-29", "설날"], ["01-30", "설날 연휴"], ["05-05", "부처님오신날"], ["10-05", "추석 연휴"], ["10-06", "추석"], ["10-07", "추석 연휴"]],
  2026: [["02-16", "설날 연휴"], ["02-17", "설날"], ["02-18", "설날 연휴"], ["05-24", "부처님오신날"], ["09-24", "추석 연휴"], ["09-25", "추석"], ["09-26", "추석 연휴"]],
  2027: [["02-06", "설날 연휴"], ["02-07", "설날"], ["02-08", "설날 연휴"], ["05-13", "부처님오신날"], ["09-14", "추석 연휴"], ["09-15", "추석"], ["09-16", "추석 연휴"]],
  2028: [["01-26", "설날 연휴"], ["01-27", "설날"], ["01-28", "설날 연휴"], ["05-02", "부처님오신날"], ["10-02", "추석 연휴"], ["10-03", "추석"], ["10-04", "추석 연휴"]],
};

/** One-off holidays (elections, temporary holidays) */
const SPECIAL: Record<number, Array<[string, string]>> = {
  2025: [["06-03", "대통령 선거일"]],
  2026: [["06-03", "전국동시지방선거일"]],
  2028: [["04-12", "국회의원 선거일"]],
};

const FIXED: Array<[string, string, boolean]> = [
  // mm-dd, name, eligible for substitute holiday
  ["01-01", "신정", false],
  ["03-01", "삼일절", true],
  ["05-05", "어린이날", true],
  ["06-06", "현충일", false],
  ["08-15", "광복절", true],
  ["10-03", "개천절", true],
  ["10-09", "한글날", true],
  ["12-25", "기독탄신일", true],
];

export function holidaysForYear(year: number): Holiday[] {
  const base: Array<Holiday & { sub: boolean }> = [];
  for (const [md, name, sub] of FIXED) base.push({ date: `${year}-${md}`, name, sub });
  for (const [md, name] of LUNAR[year] ?? []) base.push({ date: `${year}-${md}`, name, sub: true });
  for (const [md, name] of SPECIAL[year] ?? []) base.push({ date: `${year}-${md}`, name, sub: false });
  base.sort((a, b) => a.date.localeCompare(b.date));

  const taken = new Set(base.map((h) => h.date));
  const out: Holiday[] = base.map(({ date, name }) => ({ date, name }));
  // substitute holidays: evaluate in date order so chained substitutes land correctly
  const occupied = new Set(taken);
  const substituted = new Set<string>();
  for (const h of base) {
    if (!h.sub || substituted.has(h.date)) continue;
    const d = parse(h.date);
    // overlap with another holiday on a weekday also triggers one substitute (e.g. 어린이날 == 부처님오신날 in 2025)
    const overlaps = base.filter((o) => o.date === h.date).length > 1;
    if (!isWeekend(d) && !overlaps) continue;
    substituted.add(h.date);
    let s = addDays(d, 1);
    while (isWeekend(s) || occupied.has(ymd(s))) s = addDays(s, 1);
    occupied.add(ymd(s));
    out.push({ date: ymd(s), name: `대체공휴일(${h.name})`, substitute: true });
  }
  // de-duplicate overlapping names on the same date (e.g. 어린이날 == 부처님오신날 in 2025) — keep both names joined
  const byDate = new Map<string, Holiday>();
  for (const h of out) {
    const prev = byDate.get(h.date);
    if (prev) prev.name = `${prev.name}·${h.name}`;
    else byDate.set(h.date, { ...h });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export const hasLunarTable = (year: number) => year in LUNAR;

export class Calendar {
  private cache = new Map<number, Map<string, string>>();
  constructor(private readonly extra: Holiday[] = []) {}
  private year(y: number) {
    let m = this.cache.get(y);
    if (!m) {
      m = new Map(holidaysForYear(y).map((h) => [h.date, h.name]));
      for (const e of this.extra) if (e.date.startsWith(`${y}-`)) m.set(e.date, e.name);
      this.cache.set(y, m);
    }
    return m;
  }
  holidayName(d: Date): string | null { return this.year(d.getUTCFullYear()).get(ymd(d)) ?? null; }
  isBusinessDay(d: Date): boolean { return !isWeekend(d) && !this.holidayName(d); }
  nextBusinessDay(d: Date, inclusive = true): Date { let x = inclusive ? d : addDays(d, 1); while (!this.isBusinessDay(x)) x = addDays(x, 1); return x; }
  prevBusinessDay(d: Date, inclusive = true): Date { let x = inclusive ? d : addDays(d, -1); while (!this.isBusinessDay(x)) x = addDays(x, -1); return x; }
  addBusinessDays(d: Date, n: number): Date {
    let x = d, left = Math.abs(n); const step = n >= 0 ? 1 : -1;
    while (left > 0) { x = addDays(x, step); if (this.isBusinessDay(x)) left--; }
    return x;
  }
  countBusinessDays(from: Date, to: Date): number {
    let n = 0; for (let x = from; x.getTime() <= to.getTime(); x = addDays(x, 1)) if (this.isBusinessDay(x)) n++;
    return n;
  }
  list(year: number): Holiday[] { return [...this.year(year).entries()].map(([date, name]) => ({ date, name })).sort((a, b) => a.date.localeCompare(b.date)); }
}
