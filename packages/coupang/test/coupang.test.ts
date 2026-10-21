import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { sign, signedDate } from "../src/auth.js";
import { CoupangClient, CoupangApiError } from "../src/client.js";
import { listOrders, confirmOrders, updateQuantity, getProduct, money } from "../src/tools.js";

const creds = { accessKey: "AK", secretKey: "SK", vendorId: "A00012345" };
const fixedNow = new Date(Date.UTC(2026, 9, 21, 8, 5, 9)); // 2026-10-21 08:05:09Z

test("signed-date is UTC yyMMddTHHmmssZ", () => {
  assert.equal(signedDate(fixedNow), "261021T080509Z");
});

test("signature = hex HMAC-SHA256(secret, date+METHOD+path+query) and header has the CEA shape", () => {
  const path = "/v2/providers/openapi/apis/api/v5/vendors/A00012345/ordersheets";
  const query = "createdAtFrom=2026-10-14%2B09%3A00&status=ACCEPT";
  const { authorization } = sign({ method: "get", path, query, accessKey: "AK", secretKey: "SK", now: fixedNow });
  const expected = createHmac("sha256", "SK").update("261021T080509Z" + "GET" + path + query).digest("hex");
  assert.equal(authorization, `CEA algorithm=HmacSHA256, access-key=AK, signed-date=261021T080509Z, signature=${expected}`);
});

function fakeFetch(handler: (url: URL, init: RequestInit) => { status?: number; body: unknown }) {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, init: init ?? {} });
    const r = handler(url, init ?? {});
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

test("list orders: signed query equals the sent query (incl. +09:00 encoding) and money objects flatten", async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({
    body: {
      code: 200, message: "OK", nextToken: "",
      data: [{
        shipmentBoxId: 1, orderId: 2, orderedAt: "2026-10-20T10:00:00", status: "ACCEPT",
        orderer: { name: "홍길동", safeNumber: "0503-000-0000" },
        receiver: { name: "홍길동", addr1: "서울시", addr2: "1동 101호", postCode: "04524" },
        orderItems: [{ vendorItemId: 9, vendorItemName: "블랙 L", shippingCount: 2, salesPrice: { currencyCode: "KRW", units: 15000, nanos: 0 }, orderPrice: { units: 30000, nanos: 0 } }],
      }],
    },
  }));
  const c = new CoupangClient(creds, { fetchImpl, now: () => fixedNow });
  const out = await listOrders.handler(c, { status: "ACCEPT", from: "2026-10-14", to: "2026-10-21", maxPerPage: 50 }) as { orders: Array<{ items: Array<{ salesPrice: number }>; receiver: { address: string } }> };
  const { url, init } = calls[0];
  assert.equal(url.pathname, "/v2/providers/openapi/apis/api/v5/vendors/A00012345/ordersheets");
  assert.equal(url.searchParams.get("createdAtFrom"), "2026-10-14+09:00");
  assert.ok(url.search.includes("2026-10-14%2B09%3A00"), "plus sign is percent-encoded on the wire");
  const auth = String((init.headers as Record<string, string>).Authorization);
  const sig = auth.match(/signature=([0-9a-f]+)$/)![1];
  const expected = createHmac("sha256", "SK").update("261021T080509Z" + "GET" + url.pathname + url.search.slice(1)).digest("hex");
  assert.equal(sig, expected, "signature computed over the exact bytes sent");
  assert.equal(out.orders[0].items[0].salesPrice, 15000);
  assert.equal(out.orders[0].receiver.address, "서울시 1동 101호");
});

test("confirm orders: PATCH body carries vendorId + ids, per-order results mapped", async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({
    body: { code: 200, data: { responseCode: 1, responseMessage: "partial", responseList: [{ shipmentBoxId: 1, succeed: true, resultCode: "SUCCESS" }, { shipmentBoxId: 2, succeed: false, resultCode: "CANCELLED", retryRequired: false, resultMessage: "취소된 주문" }] } },
  }));
  const c = new CoupangClient(creds, { fetchImpl });
  const out = await confirmOrders.handler(c, { shipmentBoxIds: [1, 2] }) as { result: string; perOrder: Array<{ succeed: boolean }> };
  assert.equal(calls[0].init.method, "PATCH");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { vendorId: "A00012345", shipmentBoxIds: [1, 2] });
  assert.equal(out.result, "partial errors");
  assert.equal(out.perOrder[1].succeed, false);
});

test("update quantity hits PUT .../quantities/{n}; HTTP 200 with code ERROR raises", async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({ body: { code: "SUCCESS", message: "ok" } }));
  const c = new CoupangClient(creds, { fetchImpl });
  await updateQuantity.handler(c, { vendorItemId: 77, quantity: 0 });
  assert.equal(calls[0].url.pathname, "/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/77/quantities/0");
  assert.equal(calls[0].init.method, "PUT");

  const bad = fakeFetch(() => ({ body: { code: "ERROR", message: "존재하지 않는 옵션" } }));
  const c2 = new CoupangClient(creds, { fetchImpl: bad.fetchImpl });
  await assert.rejects(() => updateQuantity.handler(c2, { vendorItemId: 1, quantity: 3 }), (e: unknown) => e instanceof CoupangApiError && /존재하지 않는 옵션/.test(e.message));
});

test("get product maps items to the fields an agent needs", async () => {
  const { fetchImpl } = fakeFetch(() => ({
    body: { code: "SUCCESS", data: { sellerProductId: 5, sellerProductName: "티셔츠", statusName: "승인완료", items: [{ vendorItemId: 9, itemName: "블랙 L", salePrice: 15000, originalPrice: 20000, maximumBuyCount: 100 }] } },
  }));
  const c = new CoupangClient(creds, { fetchImpl });
  const out = await getProduct.handler(c, { sellerProductId: 5 }) as { items: Array<{ vendorItemId: number; salePrice: number }> };
  assert.equal(out.items[0].vendorItemId, 9);
  assert.equal(out.items[0].salePrice, 15000);
});

test("money() handles numbers, objects and null", () => {
  assert.equal(money(1000), 1000);
  assert.equal(money({ units: "12", nanos: 500000000 }), 12.5);
  assert.equal(money(null), null);
});
