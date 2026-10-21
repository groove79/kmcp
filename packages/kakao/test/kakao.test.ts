import { test } from "node:test";
import assert from "node:assert/strict";
import { KakaoAuth, MemoryTokenStore, TOKEN_URL, DEFAULT_REDIRECT } from "../src/auth.js";
import { KakaoClient, KakaoApiError } from "../src/client.js";
import { buildTemplate, sendToMe, sendToFriends, listFriends } from "../src/tools.js";

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

test("authorize URL carries client_id, redirect, scopes, state", () => {
  const auth = new KakaoAuth({ clientId: "rest-key", store: new MemoryTokenStore() });
  const u = new URL(auth.authorizeUrl("st4te"));
  assert.equal(u.origin + u.pathname, "https://kauth.kakao.com/oauth/authorize");
  assert.equal(u.searchParams.get("client_id"), "rest-key");
  assert.equal(u.searchParams.get("redirect_uri"), DEFAULT_REDIRECT);
  assert.equal(u.searchParams.get("scope"), "talk_message,friends");
  assert.equal(u.searchParams.get("state"), "st4te");
});

test("code exchange stores tokens; refresh keeps the old refresh token when Kakao omits a new one", async () => {
  let now = 1_700_000_000_000;
  let n = 0;
  const { fetchImpl, calls } = fakeFetch(() => {
    n++;
    return { body: n === 1
      ? { token_type: "bearer", access_token: "acc1", expires_in: 21600, refresh_token: "ref1", refresh_token_expires_in: 5184000, scope: "talk_message friends" }
      : { token_type: "bearer", access_token: "acc2", expires_in: 21600 } };
  });
  const store = new MemoryTokenStore();
  const auth = new KakaoAuth({ clientId: "k", clientSecret: "s", store, fetchImpl, now: () => now });
  const t1 = await auth.exchangeCode("c0de");
  assert.equal(calls[0].url.href, TOKEN_URL);
  const p = new URLSearchParams(String(calls[0].init.body));
  assert.equal(p.get("grant_type"), "authorization_code");
  assert.equal(p.get("client_secret"), "s");
  assert.equal(t1.refresh_token, "ref1");
  assert.equal(await auth.getAccessToken(), "acc1", "fresh token reused");

  now += 21600_000; // expired
  assert.equal(await auth.getAccessToken(), "acc2");
  const t2 = await store.load();
  assert.equal(t2?.refresh_token, "ref1", "old refresh token kept");
  assert.equal(t2?.scope, "talk_message friends");
});

test("buildTemplate: text vs feed, link duplication, buttons capped at 2", () => {
  const t = buildTemplate({ text: "안녕", url: "https://ok.test/r/1", buttonTitle: "승인" }) as { object_type: string; link: { web_url: string; mobile_web_url: string }; button_title: string };
  assert.equal(t.object_type, "text");
  assert.deepEqual(t.link, { web_url: "https://ok.test/r/1", mobile_web_url: "https://ok.test/r/1" });
  assert.equal(t.button_title, "승인");

  const f = buildTemplate({ title: "주문 3건", text: "확인 필요", url: "https://x.test", buttons: [{ title: "a", link: { web_url: "https://a" } }, { title: "b", link: { web_url: "https://b" } }, { title: "c", link: { web_url: "https://c" } }] }) as { object_type: string; content: { title: string; description: string }; buttons: unknown[] };
  assert.equal(f.object_type, "feed");
  assert.equal(f.content.description, "확인 필요");
  assert.equal(f.buttons.length, 2);
});

const readyStore = () => new MemoryTokenStore({ access_token: "acc", refresh_token: "ref", expires_at: Date.now() + 3600_000, refresh_expires_at: Date.now() + 86400_000 });

test("send to me posts form-encoded template_object with Bearer token", async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({ body: { result_code: 0 } }));
  const c = new KakaoClient(new KakaoAuth({ clientId: "k", store: readyStore(), fetchImpl }), { fetchImpl });
  const out = await sendToMe.handler(c, { text: "재고 0 처리 완료", url: "https://ok.test" }) as { sent: boolean };
  assert.equal(out.sent, true);
  const { url, init } = calls[0];
  assert.equal(url.href, "https://kapi.kakao.com/v2/api/talk/memo/default/send");
  assert.equal((init.headers as Record<string, string>).Authorization, "Bearer acc");
  const form = new URLSearchParams(String(init.body));
  assert.equal(JSON.parse(form.get("template_object")!).text, "재고 0 처리 완료");
});

test("send to friends: receiver_uuids JSON array; partial failure surfaced", async () => {
  const { fetchImpl, calls } = fakeFetch(() => ({ body: { successful_receiver_uuids: ["u1"], failure_info: [{ code: -4, msg: "blocked", receiver_uuids: ["u2"] }] } }));
  const c = new KakaoClient(new KakaoAuth({ clientId: "k", store: readyStore(), fetchImpl }), { fetchImpl });
  const out = await sendToFriends.handler(c, { receiverUuids: ["u1", "u2"], text: "hi" }) as { succeeded: string[]; failed: unknown[] };
  assert.deepEqual(JSON.parse(new URLSearchParams(String(calls[0].init.body)).get("receiver_uuids")!), ["u1", "u2"]);
  assert.deepEqual(out.succeeded, ["u1"]);
  assert.equal(out.failed.length, 1);
});

test("Kakao error codes become readable errors with hints", async () => {
  const { fetchImpl } = fakeFetch(() => ({ status: 403, body: { code: -3, msg: "not enabled" } }));
  const c = new KakaoClient(new KakaoAuth({ clientId: "k", store: readyStore(), fetchImpl }), { fetchImpl });
  await assert.rejects(() => listFriends.handler(c, { offset: 0, limit: 10, order: "asc" }), (e: unknown) => e instanceof KakaoApiError && e.code === -3 && /카카오톡 소셜/.test(e.message));
});
