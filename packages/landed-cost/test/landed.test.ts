import { test } from "node:test";
import assert from "node:assert/strict";
import { tools } from "../src/tools.js";

const noFetch = (async () => { throw new Error("no network in tests"); }) as unknown as typeof fetch;
const fxFetch = (rates: Record<string, number>) => (async () => new Response(JSON.stringify({ result: "success", rates, time_last_update_utc: "x" }))) as unknown as typeof fetch;
const run = (args: Record<string, unknown>, fetchImpl: typeof fetch = noFetch) =>
  (tools[0].handler as any)({ fetchImpl }, { shipping: 0, insurance: 0, currency: "USD", itemCategories: 1, buyer: "consumer", ...args });

test("EU ≤€150 after 1 Jul 2026: VAT at checkout + €3 per category", async () => {
  const r = await run({ destination: "DE", goodsValue: 100, shipping: 10, currency: "EUR", fxRate: 1, itemCategories: 2, date: "2026-10-23" });
  assert.equal(r.collectedAtCheckout, true);
  assert.deepEqual(r.charges.map((c: any) => c.amount), [20.9, 6]);
  assert.equal(r.totalLandedCost, 136.9);
});

test("EU before Jul 2026: no duty; after 2028: needs duty rate", async () => {
  const a = await run({ destination: "FR", goodsValue: 50, currency: "EUR", fxRate: 1, date: "2026-06-01" });
  assert.equal(a.charges.length, 1);
  const b = await run({ destination: "FR", goodsValue: 50, currency: "EUR", fxRate: 1, date: "2028-08-01" });
  assert.equal(b.dutyKnown, true); // computed with 0 + warning
  assert.ok(b.warnings.some((w: string) => /Duty rate not given/.test(w)));
});

test("US: no de minimis, duty on goods only", async () => {
  const r = await run({ destination: "US", goodsValue: 50, shipping: 20, dutyRate: 0.1, fxRate: 1 });
  assert.equal(r.charges[0].amount, 5);
  assert.equal(r.totalLandedCost, 75);
  const u = await run({ destination: "US", goodsValue: 50, fxRate: 1 });
  assert.equal(u.dutyKnown, false);
});

test("UK ≤£135 VAT at checkout; JP 60% rule exemption; AU low value GST", async () => {
  const gb = await run({ destination: "GB", goodsValue: 100, currency: "GBP", fxRate: 1 });
  assert.equal(gb.charges[0].amount, 20);
  const jp = await run({ destination: "JP", goodsValue: 15000, currency: "JPY", fxRate: 1 });
  assert.equal(jp.charges.length, 0);
  assert.match(jp.exemptions[0], /¥9000/);
  const jp2 = await run({ destination: "JP", goodsValue: 20000, currency: "JPY", fxRate: 1, dutyRate: 0.05 });
  assert.equal(jp2.charges[0].amount, 600); // 5% of 12,000
  assert.equal(jp2.charges[1].amount, 1260); // 10% of 12,600
  const au = await run({ destination: "AU", goodsValue: 500, shipping: 50, currency: "AUD", fxRate: 1 });
  assert.equal(au.charges[0].amount, 55);
});

test("KR thresholds use USD ($200 from US)", async () => {
  const ok = await run({ destination: "KR", origin: "US", goodsValue: 180, fxRate: 1400 });
  assert.equal(ok.charges.length, 0);
  const over = await run({ destination: "KR", origin: "JP", goodsValue: 180, shipping: 20, fxRate: 1400, dutyRate: 0.08 });
  assert.equal(over.charges[0].amount, 22400); // 8% of 280,000
  assert.equal(over.charges[1].amount, 30240); // 10% of 302,400
});

test("CA CUSMA vs other origins; CN CBEC; live FX path", async () => {
  const us = await run({ destination: "CA", origin: "US", goodsValue: 100, currency: "CAD", fxRate: 1, dutyRate: 0.18 });
  assert.equal(us.charges[0].amount, 0);
  assert.equal(us.charges[1].amount, 5);
  const cn = await run({ destination: "CA", origin: "CN", goodsValue: 100, currency: "CAD", fxRate: 1, dutyRate: 0.18 });
  assert.equal(cn.charges[0].amount, 18);
  const c = await run({ destination: "CN", goodsValue: 1000, currency: "CNY", fxRate: 1 });
  assert.equal(c.charges[0].amount, 91);
  const live = await run({ destination: "GB", goodsValue: 100 }, fxFetch({ GBP: 0.75 }));
  assert.equal(live.goods, 75);
  await assert.rejects(run({ destination: "BR", goodsValue: 1, fxRate: 1 }), /not covered/);
});
