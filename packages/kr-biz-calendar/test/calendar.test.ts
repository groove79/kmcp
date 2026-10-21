import { test } from "node:test";
import assert from "node:assert/strict";
import { Calendar, holidaysForYear, parse, ymd } from "../src/holidays.js";
import { deadlinesForYear } from "../src/deadlines.js";
import { addBusinessDays, taxCalendar, isBusinessDay } from "../src/tools.js";

const dates = (y: number) => new Map(holidaysForYear(y).map((h) => [h.date, h.name]));

test("2026 holidays: fixed + lunar + substitutes + election day", () => {
  const h = dates(2026);
  assert.equal(h.get("2026-02-17"), "설날");
  assert.ok(h.get("2026-03-02")?.startsWith("대체공휴일"), "삼일절 on Sunday → Monday");
  assert.ok(h.get("2026-05-25")?.includes("부처님오신날"), "부처님오신날 Sunday → Monday");
  assert.equal(h.get("2026-06-03"), "전국동시지방선거일");
  assert.ok(h.get("2026-08-17")?.includes("광복절"), "광복절 Saturday → Monday");
  assert.ok(h.get("2026-09-28")?.includes("추석"), "추석 연휴 Saturday → Monday");
  assert.ok(h.get("2026-10-05")?.includes("개천절"), "개천절 Saturday → Monday");
  assert.equal(h.has("2026-01-02"), false, "신정 has no substitute");
});

test("2025: 어린이날 == 부처님오신날 → exactly one substitute (5/6); 현충일 never substituted", () => {
  const h = dates(2025);
  assert.ok(h.get("2025-05-05")?.includes("어린이날") && h.get("2025-05-05")?.includes("부처님오신날"));
  assert.ok(h.get("2025-05-06")?.startsWith("대체공휴일"));
  assert.equal(h.has("2025-05-07"), false);
  // 2026-06-06 is Saturday → no substitute for 현충일
  assert.equal(dates(2026).has("2026-06-08"), false);
});

test("2028: 추석 overlaps 개천절 (10/3) → substitute generated", () => {
  const h = dates(2028);
  assert.ok(h.get("2028-10-03")?.includes("추석") && h.get("2028-10-03")?.includes("개천절"));
  assert.ok([...h.entries()].some(([d, n]) => d > "2028-10-04" && n.startsWith("대체공휴일")));
});

test("business-day arithmetic skips weekends and holidays; extra holidays respected", () => {
  const cal = new Calendar();
  // Fri 2026-02-13 + 1 business day → skips Sat/Sun and 설 연휴 (2/16–18) → Thu 2/19
  assert.equal(ymd(cal.addBusinessDays(parse("2026-02-13"), 1)), "2026-02-19");
  assert.equal(ymd(cal.addBusinessDays(parse("2026-02-19"), -1)), "2026-02-13");
  assert.equal(cal.countBusinessDays(parse("2026-02-13"), parse("2026-02-19")), 2);
  const withCompanyDay = new Calendar([{ date: "2026-02-19", name: "창립기념일" }]);
  assert.equal(ymd(withCompanyDay.addBusinessDays(parse("2026-02-13"), 1)), "2026-02-20");
});

test("deadlines shift to the next business day (1/25/2026 is Sunday → 1/26); employee rules gated", () => {
  const noEmp = deadlinesForYear(2026, { entity: "individual", employees: false });
  const vat = noEmp.find((d) => d.id === "vat-final-2h")!;
  assert.equal(vat.originalDate, "2026-01-25");
  assert.equal(vat.date, "2026-01-26");
  assert.equal(vat.shifted, true);
  assert.ok(!noEmp.some((d) => d.id === "withholding"));
  const emp = deadlinesForYear(2026, { entity: "individual", employees: true });
  assert.equal(emp.filter((d) => d.id === "withholding").length, 12);
  const half = deadlinesForYear(2026, { entity: "corporation", employees: true, withholdingHalfYear: true });
  assert.equal(half.filter((d) => d.id === "withholding").length, 2);
  assert.ok(half.some((d) => d.id === "corp-tax" && d.date === "2026-03-31"));
  assert.ok(!half.some((d) => d.id === "income-tax"));
  // 5/31/2026 is Sunday → 종합소득세 6/1
  assert.ok(emp.some((d) => d.id === "income-tax" && d.date === "2026-06-01"));
  // month-end rules clamp to the real last day (Feb)
  assert.ok(emp.some((d) => d.id === "daily-worker-statement" && d.originalDate === "2026-02-28"));
});

test("tools: month filter, upcoming window, is-business-day shape", async () => {
  const oct = await taxCalendar.handler({ year: 2026, entity: "corporation", employees: true, withholdingHalfYear: false, month: 10 }) as { deadlines: Array<{ id: string; date: string }> };
  assert.ok(oct.deadlines.some((d) => d.id === "vat-prelim-2" && d.date === "2026-10-26"), "10/25/2026 is Sunday → 10/26");
  assert.ok(oct.deadlines.every((d) => d.date.startsWith("2026-10")));
  const bd = await isBusinessDay.handler({ date: "2026-02-17" }) as { isBusinessDay: boolean; holiday: string; nextBusinessDay: string };
  assert.equal(bd.isBusinessDay, false);
  assert.equal(bd.holiday, "설날");
  assert.equal(bd.nextBusinessDay, "2026-02-19");
  const add = await addBusinessDays.handler({ from: "2026-09-23", days: 2 }) as { result: string };
  assert.equal(add.result, "2026-09-30", "skips 추석 연휴 + substitute 9/28");
});
