import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { toKstIso } from "../src/tools.js";

const SALT = bcrypt.genSaltSync(4);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Call { method: string; url: string; body?: any }

function fakeNaver(routes: Record<string, (c: Call) => unknown>) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    const c: Call = { method: init?.method ?? "GET", url: u, body: init?.body ? safeJson(String(init.body)) : undefined };
    calls.push(c);
    if (u.endsWith("/oauth2/token")) return json({ access_token: "t", expires_in: 10800, token_type: "Bearer" });
    const path = new URL(u).pathname.replace("/external", "");
    const key = `${c.method} ${path}`;
    const hit = Object.entries(routes).find(([k]) => matchRoute(k, key));
    if (!hit) return new Response(JSON.stringify({ code: "GW.NOT_FOUND", message: `no route ${key}` }), { status: 404 });
    return json(hit[1](c));
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}
const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200, headers: { "Content-Type": "application/json" } });
const safeJson = (s: string) => { try { return JSON.parse(s); } catch { return s; } };
const matchRoute = (pattern: string, key: string) => new RegExp("^" + pattern.replace(/\{\w+\}/g, "[^/]+") + "$").test(key);

async function connect(fetchImpl: typeof fetch, approveWrite?: (n: string, a: unknown) => Promise<boolean>) {
  const server = createServer({ clientId: "cid", clientSecret: SALT, fetchImpl, approveWrite });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(ct);
  return client;
}

test("registers the five tools with read/write annotations", async () => {
  const { fetchImpl } = fakeNaver({});
  const client = await connect(fetchImpl);
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["naver_get_product", "naver_list_inquiries", "naver_list_orders", "naver_list_products", "naver_update_stock"]);
  const upd = tools.find((t) => t.name === "naver_update_stock")!;
  assert.equal(upd.annotations?.readOnlyHint, false);
  assert.equal(upd.annotations?.destructiveHint, true);
  assert.equal(tools.find((t) => t.name === "naver_get_product")!.annotations?.readOnlyHint, true);
});

test("naver_list_products posts to /v1/products/search", async () => {
  const { fetchImpl, calls } = fakeNaver({ "POST /v1/products/search": () => ({ contents: [{ channelProductNo: 1 }], totalElements: 1 }) });
  const client = await connect(fetchImpl);
  const r = await client.callTool({ name: "naver_list_products", arguments: { productName: "모자" } });
  assert.equal(r.isError, undefined);
  const call = calls.find((c) => c.url.includes("/products/search"))!;
  assert.deepEqual(call.body, { page: 1, size: 50, productName: "모자" });
});

test("naver_update_stock sends option stock body and respects approval hook", async () => {
  const { fetchImpl, calls } = fakeNaver({
    "PUT /v1/products/origin-products/{no}/option-stock": () => ({ ok: true }),
    "GET /v2/products/channel-products/{no}": () => ({ originProduct: { name: "x", stockQuantity: 10, salePrice: 1 }, smartstoreChannelProduct: { a: 1 } }),
    "PUT /v2/products/channel-products/{no}": (c) => ({ ok: true, got: c.body }),
  });
  const approvals: string[] = [];
  const client = await connect(fetchImpl, async (name) => { approvals.push(name); return name !== "deny"; });
  const r = await client.callTool({ name: "naver_update_stock", arguments: { originProductNo: 99, options: [{ id: 5, stockQuantity: 3 }] } });
  assert.equal(r.isError, undefined);
  assert.deepEqual(approvals, ["naver_update_stock"]);
  const call = calls.find((c) => c.url.includes("/option-stock"))!;
  assert.equal(call.method, "PUT");
  assert.deepEqual(call.body, {
    optionInfo: { optionCombinationSortType: "CREATE", optionCombinations: [{ id: 5, stockQuantity: 3 }], useStockManagement: true },
  });

  const bad = await client.callTool({ name: "naver_update_stock", arguments: { originProductNo: 99 } });
  assert.equal(bad.isError, true);

  // No-option product: GET channel product → change stockQuantity → PUT whole (Naver has no stock-only API).
  const noOpt = await client.callTool({ name: "naver_update_stock", arguments: { channelProductNo: 777, stockQuantity: 11 } });
  assert.equal(noOpt.isError, undefined, (noOpt.content as Array<{ text: string }>)[0]?.text);
  const get = calls.find((c) => c.method === "GET" && c.url.includes("/channel-products/777"));
  assert.ok(get, "fetched detail first");
  const putWhole = calls.find((c) => c.method === "PUT" && c.url.includes("/v2/products/channel-products/777"))!;
  assert.deepEqual(putWhole.body, { originProduct: { name: "x", stockQuantity: 11, salePrice: 1 }, smartstoreChannelProduct: { a: 1 } });
  assert.ok(!calls.some((c) => c.url.includes("option-stock") && c.body?.stockQuantity === 11), "did not use option-stock for single product");
});

test("naver_list_orders chains last-changed → query", async () => {
  const { fetchImpl, calls } = fakeNaver({
    "GET /v1/pay-order/seller/product-orders/last-changed-statuses": () => ({ data: { lastChangeStatuses: [{ productOrderId: "A" }, { productOrderId: "B" }] } }),
    "POST /v1/pay-order/seller/product-orders/query": (c) => ({ data: (c.body as { productOrderIds: string[] }).productOrderIds.map((id) => ({ productOrder: { productOrderId: id } })) }),
  });
  const client = await connect(fetchImpl);
  const r = await client.callTool({ name: "naver_list_orders", arguments: {} });
  assert.equal(r.isError, undefined);
  const first = calls.find((c) => c.url.includes("last-changed-statuses"))!;
  assert.ok(new URL(first.url).searchParams.get("lastChangedFrom")?.endsWith("+09:00"));
  const q = calls.find((c) => c.url.includes("/product-orders/query"))!;
  assert.deepEqual(q.body, { productOrderIds: ["A", "B"] });
});

test("API errors surface Naver code and message to the agent", async () => {
  const fetchImpl = (async (url: string | URL) => {
    if (String(url).endsWith("/oauth2/token")) return json({ access_token: "t", expires_in: 10800 });
    return new Response(JSON.stringify({ code: "GW.RATE_LIMIT", message: "too many" }), { status: 429 });
  }) as unknown as typeof fetch;
  const client = await connect(fetchImpl);
  const r = await client.callTool({ name: "naver_get_product", arguments: { channelProductNo: 1 } });
  assert.equal(r.isError, true);
  const text = (r.content as Array<{ text: string }>)[0].text;
  assert.match(text, /HTTP 429 \[GW.RATE_LIMIT\]: too many/);
});

test("toKstIso formats with +09:00", () => {
  assert.equal(toKstIso(new Date("2026-10-21T00:00:00Z")), "2026-10-21T09:00:00.000+09:00");
});
