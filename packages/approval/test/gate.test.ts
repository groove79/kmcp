import { test } from "node:test";
import assert from "node:assert/strict";
import { createWriteGate, writeGateFromEnv, takeConfirmToken, stableJson, CONFIRM_ARG } from "../src/index.js";

const tokenOf = (m: string) => m.match(/confirm_token: "([a-z0-9]+)"/)![1];

test("confirm mode: first call refuses with preview + token; same args + token passes once", async () => {
  const g = createWriteGate();
  assert.equal(g.mode, "confirm");
  const args = { channelProductNo: 1, stockQuantity: 5 };
  const r1 = await g.check("naver_update_stock", args);
  assert.equal(r1.ok, false);
  const msg = (r1 as { message: string }).message;
  assert.match(msg, /아직 실행하지 않았습니다/);
  assert.match(msg, /stockQuantity=5/);
  assert.match(msg, /okagent\.kr/);
  const t = tokenOf(msg);
  assert.deepEqual(await g.check("naver_update_stock", { stockQuantity: 5, channelProductNo: 1 }, t), { ok: true }, "key order does not matter");
  assert.equal((await g.check("naver_update_stock", args, t)).ok, false, "token is single-use");
});

test("confirm mode: token bound to the exact args and expires", async () => {
  let now = 0;
  const g = createWriteGate({ mode: "confirm", now: () => now, confirmTtlMs: 1000, hint: false });
  const t = tokenOf((await g.check("toss_cancel_payment", { amount: 1000 }) as { message: string }).message);
  const changed = await g.check("toss_cancel_payment", { amount: 99999 }, t);
  assert.equal(changed.ok, false);
  assert.match((changed as { message: string }).message, /새로 발급/);
  assert.doesNotMatch((changed as { message: string }).message, /okagent/, "hint can be turned off");
  const t2 = tokenOf((await g.check("toss_cancel_payment", { amount: 1000 }) as { message: string }).message);
  now = 5000;
  assert.equal((await g.check("toss_cancel_payment", { amount: 1000 }, t2)).ok, false, "expired");
});

test("direct mode passes everything", async () => {
  assert.deepEqual(await createWriteGate({ mode: "direct" }).check("x_y", {}), { ok: true });
});

function svc(handler: (url: URL, init?: RequestInit) => Response) {
  return (async (u: string | URL, init?: RequestInit) => handler(new URL(String(u)), init)) as unknown as typeof fetch;
}

test("approval mode: approved / rejected / auto-approved by a rule", async () => {
  let status = "approved";
  const fetchImpl = svc((u, init) => init?.method === "POST" ? Response.json({ id: "r1", status: "pending" }) : Response.json({ id: "r1", status, note: "너무 많음" }));
  const g = createWriteGate({ apiKey: "K", fetchImpl, sleep: async () => {} });
  assert.equal(g.mode, "approval");
  assert.deepEqual(await g.check("a_b", {}), { ok: true });
  status = "rejected";
  const r = await g.check("a_b", {});
  assert.equal(r.ok, false);
  assert.match((r as { message: string }).message, /거부.*너무 많음/);
  const auto = createWriteGate({ apiKey: "K", fetchImpl: svc(() => Response.json({ id: "r2", status: "approved" }, { status: 201 })), sleep: async () => { throw new Error("must not poll"); } });
  assert.deepEqual(await auto.check("a_b", {}), { ok: true });
});

test("approval mode: quota 402 and bad key 401 become clear messages; network errors never throw", async () => {
  const q = createWriteGate({ apiKey: "K", fetchImpl: svc(() => Response.json({ error: "quota_exceeded", message: "무료 한도(200건)를 다 썼습니다.", upgradeUrl: "https://okagent.kr/dashboard" }, { status: 402 })) });
  const r = await q.check("a_b", {});
  assert.match((r as { message: string }).message, /200건.*https:\/\/okagent\.kr\/dashboard/);
  const k = await createWriteGate({ apiKey: "K", fetchImpl: svc(() => new Response("no", { status: 401 })) }).check("a_b", {});
  assert.match((k as { message: string }).message, /OKAGENT_API_KEY/);
  const n = await createWriteGate({ apiKey: "K", fetchImpl: (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch }).check("a_b", {});
  assert.match((n as { message: string }).message, /연결하지 못했습니다/);
});

test("writeGateFromEnv: modes from env, legacy APPROVAL_* still works", () => {
  assert.equal(writeGateFromEnv({}).mode, "confirm");
  assert.equal(writeGateFromEnv({ OKAGENT_API_KEY: "ok_x" }).mode, "approval");
  assert.equal(writeGateFromEnv({ APPROVAL_URL: "https://x", APPROVAL_API_KEY: "k" }).mode, "approval");
  assert.equal(writeGateFromEnv({ KMCP_WRITE_MODE: "direct" }).mode, "direct");
  assert.equal(writeGateFromEnv({ KMCP_WRITE_MODE: "approval" }).mode, "confirm", "approval without key falls back");
});

test("takeConfirmToken / stableJson", () => {
  assert.deepEqual(takeConfirmToken({ a: 1, [CONFIRM_ARG]: "tok" }), { args: { a: 1 }, token: "tok" });
  assert.deepEqual(takeConfirmToken({ a: 1 }), { args: { a: 1 }, token: undefined });
  assert.equal(stableJson({ b: [2, { d: 1, c: 0 }], a: undefined, e: null }), '{"b":[2,{"c":0,"d":1}],"e":null}');
});
