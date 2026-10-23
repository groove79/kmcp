import { test } from "node:test";
import assert from "node:assert/strict";
import { WorldCalendar, todayIn } from "../src/engine.js";
import { tools } from "../src/tools.js";

const run = (name: string, args: unknown) => (tools.find((t) => t.name === name)!.handler as (a: unknown) => Promise<any>)(args);

test("US: July 4 2026 (Sat) observed on Fri July 3", () => {
  const c = new WorldCalendar("US");
  assert.equal(c.isBusinessDay(new Date("2026-07-03T00:00:00Z")), false);
  assert.equal(c.isBusinessDay(new Date("2026-07-06T00:00:00Z")), true);
});

test("regions: Bavaria has Epiphany, Berlin does not", () => {
  assert.equal(new WorldCalendar("DE", "BY").isBusinessDay(new Date("2026-01-06T00:00:00Z")), false);
  assert.equal(new WorldCalendar("DE", "BE").isBusinessDay(new Date("2026-01-06T00:00:00Z")), true);
});

test("local weekends: Saudi Friday off, Sunday on", () => {
  const sa = new WorldCalendar("SA");
  assert.equal(sa.isBusinessDay(new Date("2026-10-23T00:00:00Z")), false); // Fri
  assert.equal(sa.isBusinessDay(new Date("2026-10-25T00:00:00Z")), true); // Sun
});

test("Korea uses the K-MCP engine (2026 노동절)", () => {
  const kr = new WorldCalendar("KR");
  assert.equal(kr.isBusinessDay(new Date("2026-05-01T00:00:00Z")), false);
});

test("Japan Golden Week add business days", async () => {
  const r = await run("world_add_business_days", { country: "JP", from: "2026-04-30", days: 1, includeBank: false });
  assert.equal(r.result, "2026-05-01");
  const r2 = await run("world_add_business_days", { country: "JP", from: "2026-05-01", days: 1, includeBank: false });
  assert.equal(r2.result, "2026-05-07");
  assert.ok(r2.holidaysSkipped.length >= 3);
});

test("count, common days, errors", async () => {
  const n = await run("world_add_business_days", { country: "GB", from: "2026-12-21", to: "2026-12-31", includeBank: false });
  assert.equal(n.businessDays, 7); // 25, 26→28 substitute
  const c = await run("world_common_business_days", { countries: ["US", "JP"], from: "2026-05-01", to: "2026-05-08" });
  assert.ok(!c.commonBusinessDays.includes("2026-05-04"));
  assert.ok(c.commonBusinessDays.includes("2026-05-07"));
  await assert.rejects(run("world_is_business_day", { country: "ZZ", includeBank: false }), /Unknown country/);
  await assert.rejects(run("world_is_business_day", { country: "US", region: "XX", includeBank: false }), /Unknown region/);
  assert.match(todayIn("JP"), /^\d{4}-\d{2}-\d{2}$/);
});

test("list countries and holidays", async () => {
  const c = await run("world_list_countries", {});
  assert.ok(c.count > 190);
  const h = await run("world_list_holidays", { country: "FR", year: 2026, types: ["public"] });
  assert.ok(h.holidays.some((x: any) => x.date === "2026-07-14"));
  assert.ok(h.holidays.every((x: any) => /^\d{4}-\d{2}-\d{2}$/.test(x.date)));
});
