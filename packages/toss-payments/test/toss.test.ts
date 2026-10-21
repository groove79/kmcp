import { test } from "node:test";
import assert from "node:assert/strict";
import { TossClient, TossApiError } from "../src/client.js";
import { getPayment, cancelPayment, listTransactions, listSettlements } from "../src/tools.js";

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

const payment = { paymentKey: "pk1", orderId: "o1", orderName: "티셔츠", status: "DONE", method: "카드", totalAmount: 15000, balanceAmount: 15000, currency: "KRW", card: { number: "1234****", installmentPlanMonths: 0 }, receipt: { url: "https://r" }, cancels: null };

test("Basic auth = base64(secretKey:) ; test key flagged", async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({ body: payment }));
  const c = new TossClient("test_sk_abc", { fetchImpl });
  assert.equal(c.isTest, true);
  await getPayment.handler(c, { paymentKey: "pk1" });
  const h = calls[0].init.headers as Record<string, string>;
  assert.equal(h.Authorization, `Basic ${Buffer.from("test_sk_abc:").toString("base64")}`);
  assert.equal(calls[0].url.pathname, "/v1/payments/pk1");
  assert.equal(h["Idempotency-Key"], undefined, "GET has no idempotency key");
});

test("get by orderId uses /v1/payments/orders/{id}; view trims and keeps balanceAmount", async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({ body: payment }));
  const c = new TossClient("live_sk_x", { fetchImpl });
  const out = await getPayment.handler(c, { orderId: "o 1" }) as { balanceAmount: number; card: { number: string }; receiptUrl: string };
  assert.equal(calls[0].url.pathname, "/v1/payments/orders/o%201");
  assert.equal(out.balanceAmount, 15000);
  assert.equal(out.card.number, "1234****");
  assert.equal(out.receiptUrl, "https://r");
});

test("cancel posts JSON with Idempotency-Key (caller's key reused) and omits cancelAmount for a full cancel", async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({ body: { ...payment, status: "CANCELED", balanceAmount: 0, cancels: [{ cancelAmount: 15000, cancelReason: "고객 변심", canceledAt: "2026-10-21T10:00:00+09:00" }] } }));
  const c = new TossClient("test_sk_abc", { fetchImpl, idempotencyKey: () => "gen-1" });
  const out = await cancelPayment.handler(c, { paymentKey: "pk1", cancelReason: "고객 변심" }) as { status: string; cancels: unknown[] };
  const { url, init } = calls[0];
  assert.equal(url.pathname, "/v1/payments/pk1/cancel");
  assert.equal(init.method, "POST");
  assert.deepEqual(JSON.parse(String(init.body)), { cancelReason: "고객 변심" });
  assert.equal((init.headers as Record<string, string>)["Idempotency-Key"], "gen-1");
  assert.equal(out.status, "CANCELED");
  assert.equal(out.cancels.length, 1);

  await cancelPayment.handler(c, { paymentKey: "pk1", cancelReason: "부분", cancelAmount: 5000, idempotencyKey: "mine" });
  assert.equal((calls[1].init.headers as Record<string, string>)["Idempotency-Key"], "mine");
  assert.equal(JSON.parse(String(calls[1].init.body)).cancelAmount, 5000);
});

test("Toss error body {code,message} becomes TossApiError", async () => {
  const { fetchImpl } = fakeFetch(() => ({ status: 400, body: { code: "ALREADY_CANCELED_PAYMENT", message: "이미 취소된 결제 입니다." } }));
  const c = new TossClient("test_sk_abc", { fetchImpl });
  await assert.rejects(() => cancelPayment.handler(c, { paymentKey: "pk1", cancelReason: "x" }), (e: unknown) => e instanceof TossApiError && e.code === "ALREADY_CANCELED_PAYMENT" && e.status === 400);
});

test("transactions: paging cursor only when the page is full; settlements sum payOutAmount", async () => {
  const tx = (n: number) => Array.from({ length: n }, (_, i) => ({ transactionKey: `t${i}`, paymentKey: "p", orderId: "o", amount: 100, status: "DONE" }));
  const a = fakeFetch(() => ({ body: tx(2) }));
  const c = new TossClient("test_sk_abc", { fetchImpl: a.fetchImpl });
  const full = await listTransactions.handler(c, { startDate: "2026-10-01", endDate: "2026-10-21", limit: 2 }) as { nextStartingAfter: string | null; startDate: string; notes: string[] };
  assert.equal(full.nextStartingAfter, "t1");
  assert.equal(a.calls[0].url.searchParams.get("limit"), "2");
  assert.equal(full.startDate, "2026-10-19", "test key → 3-day clamp (verified against the live sandbox: INVALID_DATE beyond 3 days)");
  assert.equal(a.calls[0].url.searchParams.get("startDate"), "2026-10-19");
  assert.equal(full.notes.length, 1);
  const live = new TossClient("live_sk_x", { fetchImpl: a.fetchImpl });
  const unclamped = await listTransactions.handler(live, { startDate: "2026-10-01", endDate: "2026-10-21", limit: 2 }) as { startDate: string };
  assert.equal(unclamped.startDate, "2026-10-01");
  const partial = await listTransactions.handler(c, { startDate: "2026-10-01", endDate: "2026-10-21", limit: 5 }) as { nextStartingAfter: string | null };
  assert.equal(partial.nextStartingAfter, null);

  const s = fakeFetch(() => ({ body: [{ paymentKey: "p1", payOutAmount: 9700, fees: [{ type: "BASE", fee: 300 }] }, { paymentKey: "p2", payOutAmount: 19400 }] }));
  const c2 = new TossClient("test_sk_abc", { fetchImpl: s.fetchImpl });
  const out = await listSettlements.handler(c2, { startDate: "2026-10-01", endDate: "2026-10-21", dateType: "paidOutDate", page: 1, size: 100 }) as { totalPayOut: number; hasMore: boolean };
  assert.equal(s.calls[0].url.searchParams.get("dateType"), "paidOutDate");
  assert.equal(out.totalPayOut, 29100);
  assert.equal(out.hasMore, false);
});
