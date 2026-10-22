import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { maskDeep, maskUrl, maskValue } from "../src/mask.js";
import { recordingFetch, replayFetch, requestKey, type Exchange } from "../src/recorder.js";
import { shapeOf, diffShape, classifyError, classifyOutput } from "../src/schema.js";
import { buildReport, kakaoText, needsAlert } from "../src/report.js";
import { runChecks } from "../src/run.js";
import { MemoryTokenBag } from "../src/secrets.js";
import type { Check } from "../src/types.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("mask: credentials, PII keys and KR patterns are redacted; ids kept", () => {
  const out = maskDeep({ access_token: "abc", receiverName: "홍길동", receiverTel: "010-1234-5678", product_no: 10, note: "call 01012345678 or a@b.co", nested: { Authorization: "Bearer xyz" } }) as Record<string, unknown>;
  assert.equal(out.access_token, "***"); assert.equal(out.receiverName, "***"); assert.equal(out.receiverTel, "***");
  assert.equal(out.product_no, 10);
  assert.equal(out.note, "call *** or ***");
  assert.equal((out.nested as Record<string, string>).Authorization, "***");
  assert.equal(maskValue("key test_sk_abc123 and $2a$04$lRffKL8dAHzzNe0foQ7MpeABCDEFGHIJKLMNOPQRSTUVWXYZ0123"), "key *** and ***");
  assert.equal(maskUrl("https://x.kr/a?serviceKey=S&page=1&timestamp=9"), "https://x.kr/a?serviceKey=***&page=1&timestamp=***");
});

test("recorder: key ignores volatile params and credential form fields; replay returns recorded body in order", async () => {
  const k1 = requestKey("GET", "https://api.x/v1/items?b=2&a=1&timestamp=1", null);
  const k2 = requestKey("GET", "https://api.x/v1/items?a=1&b=2&timestamp=2", null);
  assert.equal(k1, k2);
  const f1 = requestKey("POST", "https://api.x/token", "client_id=c&timestamp=1&client_secret_sign=x&grant_type=cc");
  const f2 = requestKey("POST", "https://api.x/token", "client_id=c&timestamp=2&client_secret_sign=y&grant_type=cc");
  assert.equal(f1, f2);

  const sink: Exchange[] = [];
  let n = 0;
  const real = (async () => new Response(JSON.stringify({ n: ++n, token: "secret" }), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
  const rec = recordingFetch(real, sink);
  await rec("https://api.x/v1/items?page=1"); await rec("https://api.x/v1/items?page=1");
  assert.equal(sink.length, 2);
  assert.equal((sink[0].res.body as { token: string }).token, "***", "secrets masked in cassette");
  const rep = replayFetch({ recordedAt: "", exchanges: sink });
  const a = await (await rep("https://api.x/v1/items?page=1&timestamp=5")).json();
  const b = await (await rep("https://api.x/v1/items?page=1")).json();
  assert.deepEqual([a.n, b.n], [1, 2]);
  await assert.rejects(() => rep("https://api.x/v1/other"), /No cassette exchange/);
});

test("schema: shape diff + classification", () => {
  const rec = shapeOf({ products: [{ id: 1, name: "a", price: "10" }], total: 2 });
  const live = shapeOf({ products: [{ id: 1, name: "a", price: 10, newField: true }] });
  const d = diffShape(rec, live);
  assert.deepEqual(d.removed, ["total"]);
  assert.deepEqual(d.added, ["products[].newField"]);
  assert.deepEqual(d.typeChanged, [{ path: "products[].price", from: "string", to: "number" }]);
  assert.equal(classifyError(Object.assign(new Error("HTTP 401 invalid_token"), { status: 401 })).class, "AUTH");
  assert.equal(classifyError(new Error("fetch failed ETIMEDOUT")).class, "DOWN");
  assert.equal(classifyError(new Error("Cannot read properties of undefined")).class, "BREAK");
  const contract = z.object({ products: z.array(z.object({ id: z.number() })) });
  assert.equal(classifyOutput({ products: [{ id: 1 }] }, contract, null).class, "OK");
  assert.equal(classifyOutput({ products: [{ id: "x" }] }, contract, null).class, "BREAK");
  assert.equal(classifyOutput({ products: [{ id: 1, extra: 1 }] }, contract, shapeOf({ products: [{ id: 1 }] })).class, "DRIFT");
});

test("run: SKIP on missing env, record→replay round trip through a real check definition, revert runs", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canary-"));
  let reverted = 0;
  const api = (async (u: string | URL | Request) => new Response(JSON.stringify({ ok: true, url: String(u) }), { headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
  const check: Check = {
    id: "demo.ping", platform: "demo", access: "write-sandbox", needs: ["DEMO_KEY"], expect: z.object({ ok: z.boolean() }),
    run: async (ctx) => (await ctx.fetchImpl("https://demo.x/ping?serviceKey=" + ctx.env.DEMO_KEY)).json(),
    revert: async () => { reverted++; },
  };
  const skip = await runChecks([check], { mode: "live", cassetteDir: dir, env: {}, tokens: new MemoryTokenBag() });
  assert.equal(skip[0].class, "SKIP");
  // record with a stubbed global fetch
  const realFetch = globalThis.fetch; globalThis.fetch = api;
  try {
    const rec = await runChecks([check], { mode: "record", cassetteDir: dir, env: { DEMO_KEY: "k" }, tokens: new MemoryTokenBag() });
    assert.equal(rec[0].class, "OK"); assert.match(rec[0].note!, /recorded 1 exchanges/);
  } finally { globalThis.fetch = realFetch; }
  const rep = await runChecks([check], { mode: "replay", cassetteDir: dir, env: { DEMO_KEY: "other" }, tokens: new MemoryTokenBag() });
  assert.equal(rep[0].class, "OK", rep[0].note ?? "");
  assert.equal(reverted, 2, "revert ran once per executed run (record + replay)");
});

test("report: summary counts, alert decision, kakao text", () => {
  const r = buildReport("live", [
    { id: "a.x", platform: "a", access: "read", class: "OK", ms: 1, note: null },
    { id: "b.y", platform: "b", access: "read", class: "AUTH", ms: 1, note: "401 token expired" },
    { id: "c.z", platform: "c", access: "read", class: "SKIP", ms: 0, note: "needs K" },
  ], []);
  assert.equal(r.summary.OK, 1); assert.equal(r.summary.AUTH, 1); assert.equal(r.summary.SKIP, 1);
  assert.equal(needsAlert(r), true);
  assert.match(kakaoText(r), /🔑 b\.y: 401 token expired/);
});
