import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { makeClientSecretSign, TokenProvider, TOKEN_URL } from "../src/auth.js";

// A bcrypt salt in the shape Naver issues ($2a$04$ + 22 chars).
const SALT = bcrypt.genSaltSync(4);

test("client_secret_sign = base64(bcrypt(clientId_timestamp, secret))", () => {
  const sign = makeClientSecretSign("abc", SALT, 1700000000000);
  const decoded = Buffer.from(sign, "base64").toString("utf8");
  assert.ok(decoded.startsWith("$2a$04$"), "decoded value is a bcrypt hash");
  assert.ok(bcrypt.compareSync("abc_1700000000000", decoded));
});

test("TokenProvider posts the right form fields and caches until near expiry", async () => {
  const calls: Array<{ url: string; body: string }> = [];
  let now = 1_700_000_000_000;
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body) });
    return new Response(JSON.stringify({ access_token: `tok${calls.length}`, expires_in: 10800, token_type: "Bearer" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;

  const tp = new TokenProvider({ clientId: "cid", clientSecret: SALT, fetchImpl, now: () => now });
  assert.equal(await tp.getToken(), "tok1");
  assert.equal(calls[0].url, TOKEN_URL);
  const params = new URLSearchParams(calls[0].body);
  assert.equal(params.get("client_id"), "cid");
  assert.equal(params.get("timestamp"), String(now));
  assert.equal(params.get("grant_type"), "client_credentials");
  assert.equal(params.get("type"), "SELF");
  assert.ok(params.get("client_secret_sign"));

  assert.equal(await tp.getToken(), "tok1", "cached");
  now += 10_800_000 - 30_000; // 30s before expiry → refresh
  assert.equal(await tp.getToken(), "tok2");
});
