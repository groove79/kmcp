import { test } from "node:test";
import assert from "node:assert/strict";
import { ApprovalClient, approverFromEnv, createApprover, describeToolCall } from "../src/index.js";

/** Fake OK Agent service: records requests, lets the test decide them. */
function fakeService() {
  const store = new Map<string, { status: string; req: unknown }>();
  const calls: string[] = [];
  let n = 0;
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    const u = new URL(String(url));
    calls.push(`${init?.method ?? "GET"} ${u.pathname}`);
    const auth = (init?.headers as Record<string, string>)?.Authorization;
    if (auth !== "Bearer K") return new Response("unauthorized", { status: 401 });
    if (init?.method === "POST" && u.pathname === "/api/v1/requests") {
      const id = `req_${++n}`;
      store.set(id, { status: "pending", req: JSON.parse(String(init.body)) });
      return Response.json({ id, status: "pending", approveUrl: `https://ok.test/r/${id}` });
    }
    const m = u.pathname.match(/^\/api\/v1\/requests\/(.+)$/);
    if (m && store.has(m[1])) return Response.json({ id: m[1], status: store.get(m[1])!.status });
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
  return { fetchImpl, store, calls, decide: (id: string, s: string) => { store.get(id)!.status = s; } };
}
const noSleep = async () => {};

test("describeToolCall: title from tool name, args summarized, money detected", () => {
  const r = describeToolCall("naver_update_stock", { channelProductNo: 13824698105, stockQuantity: 11 });
  assert.equal(r.title, "NAVER: update stock");
  assert.equal(r.action, "naver_update_stock");
  assert.match(r.description!, /channelProductNo=13824698105, stockQuantity=11/);
  assert.equal(r.amount, undefined);
  assert.equal(describeToolCall("cafe24_update_product", { product_no: 1, price: 89000 }).amount, 89000);
});

test("createApprover: approved → true; rejected → false; polls until decided", async () => {
  const svc = fakeService();
  let pendingUrl = "";
  const approve = createApprover({ baseUrl: "https://ok.test/", apiKey: "K", fetchImpl: svc.fetchImpl, sleep: async () => { svc.decide("req_1", "approved"); }, onPending: (r) => { pendingUrl = r.approveUrl!; } });
  assert.equal(await approve("naver_update_stock", { stockQuantity: 1 }), true);
  assert.equal(pendingUrl, "https://ok.test/r/req_1");
  assert.deepEqual(svc.calls, ["POST /api/v1/requests", "GET /api/v1/requests/req_1"]);

  const reject = createApprover({ baseUrl: "https://ok.test", apiKey: "K", fetchImpl: svc.fetchImpl, sleep: async () => { svc.decide("req_2", "rejected"); } });
  assert.equal(await reject("cafe24_create_article", { title: "x" }), false);
});

test("createApprover: timeout → false (expired); service error → false, never throws", async () => {
  const svc = fakeService();
  const slow = createApprover({ baseUrl: "https://ok.test", apiKey: "K", fetchImpl: svc.fetchImpl, timeoutMs: 1, pollMs: 0, sleep: noSleep });
  assert.equal(await slow("naver_update_stock", {}), false);

  const bad = createApprover({ baseUrl: "https://ok.test", apiKey: "WRONG", fetchImpl: svc.fetchImpl, sleep: noSleep });
  assert.equal(await bad("naver_update_stock", {}), false);
});

test("createApprover: needsApproval can whitelist cheap actions", async () => {
  const svc = fakeService();
  const approve = createApprover({ baseUrl: "https://ok.test", apiKey: "K", fetchImpl: svc.fetchImpl, sleep: noSleep, needsApproval: (_t, a) => ((a as { amount?: number }).amount ?? 0) >= 100_000 });
  assert.equal(await approve("pay", { amount: 50_000 }), true);
  assert.equal(svc.calls.length, 0, "no request made for small amounts");
});

test("approverFromEnv: undefined without env; configured with env", async () => {
  assert.equal(approverFromEnv({}), undefined);
  const svc = fakeService();
  const a = approverFromEnv({ APPROVAL_URL: "https://ok.test", APPROVAL_API_KEY: "K", APPROVAL_TIMEOUT_SEC: "0" }, { fetchImpl: svc.fetchImpl, sleep: noSleep });
  assert.ok(a);
  assert.equal(await a!("x_y", {}), false); // timeout 0 → expired
});

test("ApprovalClient.ask returns immediately when service decides synchronously", async () => {
  const fetchImpl = (async () => Response.json({ id: "r", status: "approved" })) as unknown as typeof fetch;
  const c = new ApprovalClient({ baseUrl: "https://ok.test", apiKey: "K", fetchImpl });
  assert.equal((await c.ask({ title: "t", action: "a" })).status, "approved");
});
