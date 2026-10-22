import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Cafe24Auth, MemoryTokenStore, type TokenSet } from "../src/auth.js";
import { Cafe24Client } from "../src/client.js";
import { createServer } from "../src/server.js";

interface Call { method: string; url: string; headers: Record<string, string>; body?: string }
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });

function fakeCafe24(routes: Record<string, (c: Call) => unknown>, opts: { now?: () => number } = {}) {
  const calls: Call[] = [];
  let tokenN = 0;
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    const headers = Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {}));
    const c: Call = { method: init?.method ?? "GET", url: u, headers, body: init?.body ? String(init.body) : undefined };
    calls.push(c);
    if (u.endsWith("/oauth/token")) {
      tokenN++;
      const now = opts.now?.() ?? Date.now();
      return json({ access_token: `at${tokenN}`, refresh_token: `rt${tokenN}`, expires_at: new Date(now + 7200_000).toISOString(), refresh_token_expires_at: new Date(now + 14 * 86400_000).toISOString(), scopes: ["mall.read_product"] });
    }
    const path = new URL(u).pathname.replace(/^\/api\/v2\/admin/, "");
    const key = `${c.method} ${path}`;
    const hit = Object.entries(routes).find(([k]) => new RegExp("^" + k.replace(/\{\w+\}/g, "[^/]+") + "$").test(key));
    if (!hit) return json({ error: { code: 404, message: `no route ${key}` } }, 404);
    return json(hit[1](c));
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const seeded = (): TokenSet => ({ access_token: "seed", refresh_token: "seedrt", expires_at: Date.now() + 3600_000, refresh_expires_at: Date.now() + 86400_000 });

test("auth: authorize URL has code/client/state/redirect/scope", () => {
  const a = new Cafe24Auth({ mallId: "chulmul84", clientId: "cid", clientSecret: "sec", store: new MemoryTokenStore() });
  const u = new URL(a.authorizeUrl("st8"));
  assert.equal(u.origin + u.pathname, "https://chulmul84.cafe24api.com/api/v2/oauth/authorize");
  assert.equal(u.searchParams.get("response_type"), "code");
  assert.equal(u.searchParams.get("client_id"), "cid");
  assert.equal(u.searchParams.get("state"), "st8");
  assert.equal(u.searchParams.get("redirect_uri"), "http://localhost:8787/callback");
  assert.match(u.searchParams.get("scope")!, /mall\.read_product/);
});

test("auth: exchangeCode posts Basic auth + form, stores token; getAccessToken refreshes when near expiry and rotates refresh token", async () => {
  let now = 1_800_000_000_000;
  const { fetchImpl, calls } = fakeCafe24({}, { now: () => now });
  const store = new MemoryTokenStore();
  const a = new Cafe24Auth({ mallId: "m", clientId: "cid", clientSecret: "sec", store, fetchImpl, now: () => now });

  const t = await a.exchangeCode("CODE1");
  assert.equal(t.access_token, "at1");
  const req = calls[0];
  assert.equal(req.headers.Authorization, `Basic ${Buffer.from("cid:sec").toString("base64")}`);
  assert.equal(new URLSearchParams(req.body).get("grant_type"), "authorization_code");
  assert.equal(new URLSearchParams(req.body).get("code"), "CODE1");
  assert.equal((await store.load())?.refresh_token, "rt1");

  assert.equal(await a.getAccessToken(), "at1", "fresh token reused");
  now += 7200_000 - 60_000; // 1 min before expiry → refresh
  assert.equal(await a.getAccessToken(), "at2");
  assert.equal(new URLSearchParams(calls.at(-1)!.body).get("refresh_token"), "rt1");
  assert.equal((await store.load())?.refresh_token, "rt2", "rotated refresh token persisted");
});

test("auth: helpful error when never authorized", async () => {
  const a = new Cafe24Auth({ mallId: "m", clientId: "c", clientSecret: "s", store: new MemoryTokenStore() });
  await assert.rejects(() => a.getAccessToken(), /mcp-cafe24 auth/);
});

async function connect(fetchImpl: typeof fetch, approveWrite?: (n: string, a: unknown) => Promise<boolean>) {
  const server = createServer({ mallId: "m", clientId: "c", clientSecret: "s", store: new MemoryTokenStore(seeded()), fetchImpl, approveWrite });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  const client = new Client({ name: "t", version: "0" });
  await client.connect(ct);
  return client;
}

test("server: registers 7 tools, write tools annotated destructive", async () => {
  const client = await connect(fakeCafe24({}).fetchImpl);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 7);
  assert.equal(tools.find((t) => t.name === "cafe24_update_inventory")!.annotations?.destructiveHint, true);
  assert.equal(tools.find((t) => t.name === "cafe24_list_orders")!.annotations?.readOnlyHint, true);
});

test("tools: list_products sends query + version header + bearer; update_inventory PUTs wrapped body; orders defaults to 7 days with embed", async () => {
  const { fetchImpl, calls } = fakeCafe24({
    "GET /products": () => ({ products: [{ product_no: 1 }] }),
    "PUT /products/{no}/variants/{code}/inventories": () => ({ inventory: { quantity: 3 } }),
    "GET /orders": () => ({ orders: [] }),
  });
  const approvals: string[] = [];
  const client = await connect(fetchImpl, async (n) => { approvals.push(n); return true; });

  const r1 = await client.callTool({ name: "cafe24_list_products", arguments: { product_name: "드릴", display: "T" } });
  assert.equal(r1.isError, undefined);
  const lp = calls.find((c) => c.url.includes("/admin/products?"))!;
  assert.equal(lp.headers["X-Cafe24-Api-Version"], "2026-09-01");
  assert.equal(lp.headers.Authorization, "Bearer seed");
  const q = new URL(lp.url).searchParams;
  assert.equal(q.get("product_name"), "드릴"); assert.equal(q.get("display"), "T"); assert.equal(q.get("limit"), "50");

  const r2 = await client.callTool({ name: "cafe24_update_inventory", arguments: { product_no: 7, variant_code: "P0000007000A", quantity: 3 } });
  assert.equal(r2.isError, undefined);
  assert.deepEqual(approvals, ["cafe24_update_inventory"]);
  const inv = calls.find((c) => c.url.includes("/inventories"))!;
  assert.equal(inv.method, "PUT");
  assert.deepEqual(JSON.parse(inv.body!), { shop_no: 1, request: { quantity: 3, use_inventory: "T" } });

  await client.callTool({ name: "cafe24_list_orders", arguments: {} });
  const oq = new URL(calls.find((c) => c.url.includes("/admin/orders"))!.url).searchParams;
  assert.match(oq.get("start_date")!, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(oq.get("embed"), "items,buyer,receivers");
});

test("tools: Cafe24 error surfaces code + message", async () => {
  const { fetchImpl } = fakeCafe24({ "GET /boards": () => { throw new Error("unused"); } });
  const client = await connect(fetchImpl);
  const r = await client.callTool({ name: "cafe24_get_product", arguments: { product_no: 1 } });
  assert.equal(r.isError, true);
  assert.match((r.content as Array<{ text: string }>)[0].text, /HTTP 404 \[404\]: no route GET \/products\/1/);
});

test("client follows Cafe24's version hint when ours is retired (verified live 2026-10-22)", async () => {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    const headers = (init?.headers as Record<string, string>) ?? {};
    calls.push({ method: init?.method ?? "GET", url: u, headers });
    if (u.endsWith("/oauth/token")) return json({ access_token: "at", refresh_token: "rt", expires_at: new Date(Date.now() + 7200_000).toISOString(), refresh_token_expires_at: new Date(Date.now() + 14 * 86400_000).toISOString() });
    if (headers["X-Cafe24-Api-Version"] === "2026-01-01") return json({ error: { code: 400, message: "2026-01-01 version you requested is not available. The default value for the app version is 2026-09-01." } }, 400);
    return json({ products: [{ product_no: 1 }] });
  }) as unknown as typeof fetch;
  const auth = new Cafe24Auth({ mallId: "m", clientId: "c", clientSecret: "s", store: new MemoryTokenStore(seeded()), fetchImpl });
  const client = new Cafe24Client(auth, { fetchImpl, apiVersion: "2026-01-01" });
  const out = await client.get<{ products: unknown[] }>("/products");
  assert.equal(out.products.length, 1);
  assert.equal(client.apiVersion, "2026-09-01");
  const versions = calls.filter((c) => c.url.includes("/admin/products")).map((c) => c.headers["X-Cafe24-Api-Version"]);
  assert.deepEqual(versions, ["2026-01-01", "2026-09-01"]);
  await client.get("/products");
  assert.equal(calls.filter((c) => c.url.includes("/admin/products")).length, 3, "later calls use the new version directly");
});
