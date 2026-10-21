import { test } from "node:test";
import assert from "node:assert/strict";
import { landedCost } from "../src/cost.js";
import { searchRakuten, searchYahoo, fxRate, listingDraft, type Ctx } from "../src/tools.js";

const ctx = (fetchImpl: typeof fetch, extra: Partial<Ctx> = {}): Ctx => ({ fetchImpl, defaults: { shippingBaseJpy: 700, shippingPerKgJpy: 1500, platformFeeRate: 0.06 }, ...extra });
function fakeFetch(body: unknown, status = 200) {
  const calls: URL[] = [];
  const fetchImpl = (async (input: string | URL) => { calls.push(new URL(String(input))); return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

test("landed cost: under USD 150 → duty free, price = cost/(1-fee-margin) rounded up to 100", () => {
  // ¥10,000 at 9 KRW/JPY = 90,000 KRW ≈ USD 65 → duty free
  const r = landedCost({ priceJpy: 10000, weightKg: 1, jpyToKrw: 9, usdToKrw: 1380, platformFeeRate: 0.06, targetMarginRate: 0.2 });
  assert.equal(r.dutyFree, true);
  assert.equal(r.goodsKrw, 90000);
  assert.equal(r.shippingKrw, (700 + 1500) * 9);
  assert.equal(r.taxKrw, 0);
  assert.equal(r.landedCostKrw, 90000 + 19800);
  const raw = 109800 / (1 - 0.06 - 0.2);
  assert.equal(r.suggestedPriceKrw, Math.ceil(raw / 100) * 100);
  assert.ok(r.marginKrw > 0 && r.marginKrw >= r.suggestedPriceKrw * 0.2 - 100);
});

test("landed cost: over threshold → simple 20% on goods+shipping; general mode = duty then VAT on (taxable+duty)", () => {
  const simple = landedCost({ priceJpy: 40000, shippingJpy: 3000, jpyToKrw: 9, usdToKrw: 1380 });
  assert.equal(simple.dutyFree, false);
  assert.equal(simple.taxableKrw, 360000 + 27000);
  assert.equal(simple.taxKrw, Math.round(387000 * 0.2));
  const general = landedCost({ priceJpy: 40000, shippingJpy: 3000, jpyToKrw: 9, usdToKrw: 1380, taxMode: "general", dutyRate: 0.13 });
  assert.equal(general.dutyKrw, Math.round(387000 * 0.13));
  assert.equal(general.vatKrw, Math.round((387000 + general.dutyKrw) * 0.1));
  assert.ok(general.notes.some((n) => n.includes("관세 13.0%")));
});

test("landed cost: quantity multiplies goods, per-unit cost reported; invalid margin throws", () => {
  const r = landedCost({ priceJpy: 5000, quantity: 3, shippingJpy: 2000, jpyToKrw: 9, usdToKrw: 1380 });
  assert.equal(r.goodsKrw, 15000 * 9);
  assert.equal(r.landedCostPerUnitKrw, Math.round(r.landedCostKrw / 3));
  assert.throws(() => landedCost({ priceJpy: 1, jpyToKrw: 9, usdToKrw: 1380, platformFeeRate: 0.5, targetMarginRate: 0.5 }));
});

test("rakuten search: query params and item mapping (formatVersion 2)", async () => {
  const { fetchImpl, calls } = fakeFetch({ count: 1, page: 1, pageCount: 1, items: [{ itemCode: "shop:123", itemName: "ポケモン ぬいぐるみ", itemPrice: 2980, shopName: "shopA", itemUrl: "https://item.rakuten.co.jp/x", mediumImageUrls: ["https://img/1.jpg"], reviewAverage: 4.5, reviewCount: 12, availability: 1, postageFlag: 0 }] });
  const out = await searchRakuten.handler(ctx(fetchImpl, { rakutenAppId: "APP", rakutenAccessKey: "KEY" }), { keyword: "ぬいぐるみ", sort: "-reviewCount", hits: 10, page: 1, inStockOnly: true }) as { items: Array<{ priceJpy: number; postageIncluded: boolean; image: string }> };
  const u = calls[0];
  assert.equal(u.searchParams.get("applicationId"), "APP");
  assert.equal(u.searchParams.get("accessKey"), "KEY");
  assert.equal(u.searchParams.get("formatVersion"), "2");
  assert.equal(u.searchParams.get("availability"), "1");
  assert.equal(out.items[0].priceJpy, 2980);
  assert.equal(out.items[0].postageIncluded, true);
  assert.equal(out.items[0].image, "https://img/1.jpg");
});

test("rakuten/yahoo without keys explain how to get them", async () => {
  await assert.rejects(() => searchRakuten.handler(ctx(fakeFetch({}).fetchImpl), { keyword: "x", sort: "standard", hits: 10, page: 1, inStockOnly: true }), /RAKUTEN_APP_ID/);
  await assert.rejects(() => searchYahoo.handler(ctx(fakeFetch({}).fetchImpl), { query: "x", sort: "-score", results: 10, start: 1, inStockOnly: true }), /YAHOO_JP_APP_ID/);
});

test("yahoo search: appid + in_stock, free shipping code 2 → postageIncluded", async () => {
  const { fetchImpl, calls } = fakeFetch({ totalResultsAvailable: 1, hits: [{ code: "c1", name: "item", price: 1500, url: "https://store.shopping.yahoo.co.jp/x", image: { medium: "https://img" }, seller: { name: "s" }, review: { rate: 4, count: 3 }, inStock: true, shipping: { code: 2 } }] });
  const out = await searchYahoo.handler(ctx(fetchImpl, { yahooAppId: "YID" }), { query: "item", sort: "+price", results: 5, start: 1, inStockOnly: true }) as { items: Array<{ postageIncluded: boolean; shop: string }> };
  assert.equal(calls[0].searchParams.get("appid"), "YID");
  assert.equal(calls[0].searchParams.get("in_stock"), "true");
  assert.equal(out.items[0].postageIncluded, true);
  assert.equal(out.items[0].shop, "s");
});

test("fx rate derives usdToKrw from KRW/USD per JPY", async () => {
  const { fetchImpl } = fakeFetch({ result: "success", time_last_update_utc: "Tue, 21 Oct 2026 00:00:01 +0000", rates: { KRW: 9.2, USD: 0.00667 } });
  const out = await fxRate.handler(ctx(fetchImpl), {}) as { jpyToKrw: number; usdToKrw: number };
  assert.equal(out.jpyToKrw, 9.2);
  assert.equal(out.usdToKrw, Math.round((9.2 / 0.00667) * 100) / 100);
});

test("listing draft carries mandatory 해외구매대행 notice, origin Japan, and the price", async () => {
  const out = await listingDraft.handler(ctx(fakeFetch({}).fetchImpl), {
    item: { name: "ポケモン", priceJpy: 2980, url: "https://item.rakuten.co.jp/x", image: "https://img/1.jpg", source: "rakuten" },
    titleKo: "포켓몬 인형 피카츄 30cm", descriptionKo: "일본 정품", sellPriceKrw: 45000, leadTimeDays: 10, stockQuantity: 10,
  }) as { naver: { originProduct: { salePrice: number; detailContent: string; detailAttribute: { originAreaInfo: { content: string } } } }; checklist: string[] };
  assert.equal(out.naver.originProduct.salePrice, 45000);
  assert.ok(out.naver.originProduct.detailContent.includes("개인통관고유부호"));
  assert.ok(out.naver.originProduct.detailContent.includes("10일"));
  assert.equal(out.naver.originProduct.detailAttribute.originAreaInfo.content, "일본");
  assert.ok(out.checklist.length >= 3);
});
