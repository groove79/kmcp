import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

interface Call { method: string; url: URL; body?: unknown }
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });

function fake(handler: (c: Call) => unknown) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    const c: Call = { method: init?.method ?? "GET", url: new URL(String(url)), body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(c);
    const r = handler(c);
    return r instanceof Response ? r : json(r);
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

async function connect(fetchImpl: typeof fetch, keys: { dataGoKr?: string; juso?: string } = { dataGoKr: "DK", juso: "JK" }) {
  const server = createServer({ ...keys, fetchImpl });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  const client = new Client({ name: "t", version: "0" });
  await client.connect(ct);
  return client;
}
const textOf = (r: Awaited<ReturnType<Client["callTool"]>>) => (r.content as Array<{ text: string }>)[0].text;

test("kr_check_business: normalizes numbers, posts to odcloud, labels status", async () => {
  const { fetchImpl, calls } = fake(() => ({ data: [{ b_no: "1234567890", b_stt: "계속사업자", b_stt_cd: "01", tax_type: "부가가치세 일반과세자", end_dt: "", utcc_yn: "N" }, { b_no: "1111111111", b_stt: "", b_stt_cd: "", tax_type: "국세청에 등록되지 않은 사업자등록번호입니다." }] }));
  const client = await connect(fetchImpl);
  const r = await client.callTool({ name: "kr_check_business", arguments: { numbers: ["123-45-67890", "111-11-11111"] } });
  assert.equal(r.isError, undefined, textOf(r));
  const c = calls[0];
  assert.equal(c.method, "POST");
  assert.equal(c.url.host, "api.odcloud.kr");
  assert.equal(c.url.searchParams.get("serviceKey"), "DK");
  assert.deepEqual(c.body, { b_no: ["1234567890", "1111111111"] });
  const out = JSON.parse(textOf(r));
  assert.equal(out[0].status, "계속사업자(active)");
  assert.match(out[1].status, /not registered/);
});

test("kr_check_business: rejects malformed numbers before calling", async () => {
  const { fetchImpl, calls } = fake(() => ({}));
  const client = await connect(fetchImpl);
  const r = await client.callTool({ name: "kr_check_business", arguments: { numbers: ["12-34"] } });
  assert.equal(r.isError, true);
  assert.equal(calls.length, 0);
});

test("kr_holidays: one month → one call, flattens single item, YYYY-MM-DD dates", async () => {
  const { fetchImpl, calls } = fake(() => ({ response: { header: { resultCode: "00", resultMsg: "OK" }, body: { items: { item: { locdate: 20261009, dateName: "한글날", isHoliday: "Y" } } } } }));
  const client = await connect(fetchImpl);
  const r = await client.callTool({ name: "kr_holidays", arguments: { year: 2026, month: 10 } });
  const out = JSON.parse(textOf(r));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.searchParams.get("solMonth"), "10");
  assert.deepEqual(out.holidays, [{ date: "2026-10-09", name: "한글날", isHoliday: true }]);
});

test("kr_holidays: whole year → 12 calls; data.go.kr error envelope surfaces", async () => {
  let n = 0;
  const { fetchImpl } = fake(() => { n++; return { response: { header: { resultCode: "00" }, body: { items: "" } } }; });
  const client = await connect(fetchImpl);
  await client.callTool({ name: "kr_holidays", arguments: { year: 2026 } });
  assert.equal(n, 12);

  const bad = fake(() => ({ response: { header: { resultCode: "30", resultMsg: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR" }, body: {} } }));
  const c2 = await connect(bad.fetchImpl);
  const r = await c2.callTool({ name: "kr_holidays", arguments: { year: 2026, month: 1 } });
  assert.equal(r.isError, true);
  assert.match(textOf(r), /SERVICE_KEY_IS_NOT_REGISTERED/);
});

test("kr_search_address: maps juso fields; missing key gives actionable error", async () => {
  const { fetchImpl, calls } = fake(() => ({ results: { common: { errorCode: "0", errorMessage: "정상", totalCount: "1" }, juso: [{ roadAddr: "서울특별시 강남구 테헤란로 152 (역삼동)", roadAddrPart1: "서울특별시 강남구 테헤란로 152", jibunAddr: "서울특별시 강남구 역삼동 737", zipNo: "06236", bdNm: "강남파이낸스센터", siNm: "서울특별시", sggNm: "강남구", emdNm: "역삼동", engAddr: "152 Teheran-ro", bdMgtSn: "x", admCd: "1168010100" }] } }));
  const client = await connect(fetchImpl);
  const r = await client.callTool({ name: "kr_search_address", arguments: { keyword: "테헤란로 152" } });
  const out = JSON.parse(textOf(r));
  assert.equal(calls[0].url.searchParams.get("confmKey"), "JK");
  assert.equal(out.results[0].postalCode, "06236");
  assert.equal(out.results[0].building, "강남파이낸스센터");

  const noKey = await connect(fetchImpl, { dataGoKr: "DK" });
  const r2 = await noKey.callTool({ name: "kr_search_address", arguments: { keyword: "테헤란로" } });
  assert.equal(r2.isError, true);
  assert.match(textOf(r2), /JUSO_KEY/);
});

test("kr_apt_trades: parses amounts, filters by apartment name", async () => {
  const { fetchImpl, calls } = fake(() => ({ response: { header: { resultCode: "00" }, body: { totalCount: 2, items: { item: [
    { aptNm: "효성메트하임", umdNm: "송도동", dealYear: 2026, dealMonth: 9, dealDay: 3, dealAmount: " 52,000", excluUseAr: "84.98", floor: 12, buildYear: 2019, dealingGbn: "중개거래", cdealType: "" },
    { aptNm: "다른아파트", umdNm: "송도동", dealYear: 2026, dealMonth: 9, dealDay: 10, dealAmount: "70,000", excluUseAr: "101.2", floor: 5, buildYear: 2015, cdealType: "O" },
  ] } } } }));
  const client = await connect(fetchImpl);
  const r = await client.callTool({ name: "kr_apt_trades", arguments: { lawd_cd: "28185", year_month: "202609", apartment: "효성" } });
  const out = JSON.parse(textOf(r));
  assert.equal(calls[0].url.searchParams.get("LAWD_CD"), "28185");
  assert.equal(out.returned, 1);
  assert.equal(out.trades[0].price_10k_krw, 52000);
  assert.equal(out.trades[0].date, "2026-09-03");
});
