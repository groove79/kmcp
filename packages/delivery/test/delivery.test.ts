import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { DeliveryClient, DeliveryApiError } from "../src/client.js";
import { resolveCarrier } from "../src/carriers.js";
import { trackOne } from "../src/tools.js";

interface Call { headers: Record<string, string>; body: { query: string; variables: Record<string, unknown> } }
function fakeGql(handler: (c: Call) => unknown) {
  const calls: Call[] = [];
  const fetchImpl = (async (_u: string | URL, init?: RequestInit) => {
    const c: Call = { headers: (init?.headers as Record<string, string>) ?? {}, body: JSON.parse(String(init?.body)) };
    calls.push(c);
    const out = handler(c);
    return new Response(JSON.stringify(out), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}
const ev = (code: string, time: string, loc: string, desc: string) => ({ time, status: { code, name: code }, description: desc, location: { name: loc } });
const trackData = { track: { trackingNumber: "1234567890", lastEvent: ev("DELIVERED", "2026-10-21T05:12:00Z", "인천검단", "배송완료"), events: { edges: [{ node: ev("AT_PICKUP", "2026-10-20T02:00:00Z", "서울", "집화") }, { node: ev("DELIVERED", "2026-10-21T05:12:00Z", "인천검단", "배송완료") }] } } };

async function connect(fetchImpl: typeof fetch) {
  const server = createServer({ clientId: "cid", clientSecret: "sec", fetchImpl });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: "t", version: "0" });
  await client.connect(b);
  return client;
}

test("carrier aliases: Korean names, ids and fuzzy forms resolve offline", () => {
  assert.equal(resolveCarrier("CJ대한통운"), "kr.cjlogistics");
  assert.equal(resolveCarrier("우체국택배"), "kr.epost");
  assert.equal(resolveCarrier("한진"), "kr.hanjin");
  assert.equal(resolveCarrier("kr.lotte"), "kr.lotte");
  assert.equal(resolveCarrier("ヤマト運輸"), "jp.yamato");
  assert.equal(resolveCarrier("듣보잡택배"), null);
});

test("track: API-key header, KST times, delivered flag; hyphens stripped; unknown carrier goes through carriers search", async () => {
  const { fetchImpl, calls } = fakeGql((c) => c.body.query.includes("Carriers") ? { data: { carriers: { edges: [{ node: { id: "kr.newco", name: "새택배" } }], pageInfo: { hasNextPage: false, endCursor: null } } } } : { data: trackData });
  const c = new DeliveryClient("cid", "sec", { fetchImpl });
  const t = await trackOne(c, "CJ대한통운", "1234-567-890");
  assert.equal(calls[0].headers.Authorization, "TRACKQL-API-KEY cid:sec");
  assert.equal(calls[0].body.variables.carrierId, "kr.cjlogistics");
  assert.equal(calls[0].body.variables.trackingNumber, "1234567890");
  assert.equal(t.delivered, true); assert.equal(t.statusKo, "배송 완료");
  assert.equal(t.lastEvent?.time, "2026-10-21T14:12:00+09:00");
  assert.equal(t.events.length, 2);
  const t2 = await trackOne(c, "새택배", "99999999");
  assert.equal(t2.carrierId, "kr.newco"); assert.equal(t2.carrierResolvedBy, "search");
});

test("GraphQL errors surface code + hint; NOT_FOUND is a clean error", async () => {
  const { fetchImpl } = fakeGql(() => ({ errors: [{ message: "not found", extensions: { code: "NOT_FOUND" } }] }));
  const c = new DeliveryClient("cid", "sec", { fetchImpl });
  await assert.rejects(() => trackOne(c, "우체국", "1234567890"), (e: unknown) => e instanceof DeliveryApiError && e.code === "NOT_FOUND" && /운송장|tracking number/i.test(e.message));
});

test("server: 3 read-only tools; track_many aggregates and isolates per-parcel errors", async () => {
  const { fetchImpl } = fakeGql((c) => String(c.body.variables.trackingNumber) === "0000000000" ? { errors: [{ message: "nf", extensions: { code: "NOT_FOUND" } }] } : { data: trackData });
  const client = await connect(fetchImpl);
  const list = await client.listTools();
  assert.deepEqual(list.tools.map((t) => t.name).sort(), ["delivery_list_carriers", "delivery_track_many", "delivery_track_parcel"]);
  assert.ok(list.tools.every((t) => t.annotations?.readOnlyHint === true));
  const r = await client.callTool({ name: "delivery_track_many", arguments: { parcels: [{ carrier: "CJ", trackingNumber: "1234567890", ref: "order-1" }, { carrier: "한진", trackingNumber: "0000000000", ref: "order-2" }] } });
  const out = JSON.parse((r.content as Array<{ text: string }>)[0].text);
  assert.deepEqual(out.summary, { total: 2, delivered: 1, inTransit: 0, needsAttention: 1 });
  assert.equal(out.parcels[1].ref, "order-2"); assert.match(out.parcels[1].error, /NOT_FOUND/);
});
