import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { convert, detectFormat, parseAny } from "../src/convert.js";
import { decodeParaText } from "../src/hwp5.js";
import { createServer } from "../src/server.js";
import { buildHwp5, buildHwpx } from "./fixtures.js";

test("detectFormat: CFB → hwp, ZIP → hwpx, else unknown", () => {
  assert.equal(detectFormat(buildHwp5()), "hwp");
  assert.equal(detectFormat(buildHwpx()), "hwpx");
  assert.equal(detectFormat(Buffer.from("hello")), "unknown");
});

test("decodeParaText: skips 8-WCHAR inline controls, keeps 1-WCHAR ones, flags tables", () => {
  const b = Buffer.concat([Buffer.from("A", "utf16le"), Buffer.from([9, 0]), Buffer.alloc(14), Buffer.from("B", "utf16le"), Buffer.from([13, 0]), Buffer.from("C", "utf16le")]);
  const r = decodeParaText(b);
  assert.equal(r.text, "A\tB\nC");
  assert.equal(r.hasTable, false);
});

test("HWP5: headings from 개요 styles, table cells by address, trailing paragraph", () => {
  const r = convert(buildHwp5());
  assert.equal(r.stats.format, "hwp");
  assert.equal(r.stats.version, "5.0.3.0");
  assert.match(r.markdown, /^# 입찰 공고\n/);
  assert.match(r.markdown, /## 물품 내역/);
  assert.match(r.markdown, /\| 품명 \| 수량 \|\n\| --- \| --- \|\n\| 태양광 표지병 \| 120 \|/);
  assert.match(r.markdown, /끝\.\s*$/);
  assert.deepEqual(r.tables, [[["품명", "수량"], ["태양광 표지병", "120"]]]);
  assert.equal(r.stats.tables, 1);
});

test("HWP5: password / distribution flags give actionable errors", () => {
  const f = buildHwp5();
  // flip flags in FileHeader stream: find signature then flag at +36
  const i = f.indexOf(Buffer.from("HWP Document File", "latin1"));
  const enc = Buffer.from(f); enc.writeUInt32LE(1 | 2, i + 36);
  assert.throws(() => parseAny(enc), /password-protected/);
  const dist = Buffer.from(f); dist.writeUInt32LE(1 | 4, i + 36);
  assert.throws(() => parseAny(dist), /배포용/);
});

test("HWPX: headings, table, tab, metadata", () => {
  const r = convert(buildHwpx());
  assert.equal(r.stats.format, "hwpx");
  assert.equal(r.doc.meta.title, "관리비 안내문");
  assert.equal(r.doc.meta.author, "효성메트하임 관리사무소");
  assert.match(r.markdown, /^# 관리비 안내\n/);
  assert.match(r.markdown, /\| 항목 \| 금액 \|\n\| --- \| --- \|\n\| 장기수선충당금 \| 12,000 \|/);
  assert.match(r.markdown, /문의: 관리사무소\t032-000-0000/);
  assert.deepEqual(r.tables, [[["항목", "금액"], ["장기수선충당금", "12,000"]]]);
});

test("MCP: three tools; hwp_to_markdown via base64 and via url; bad input is an error not a crash", async () => {
  const hwpx = buildHwpx();
  const fetchImpl = (async (url: string | URL) => String(url).endsWith(".hwpx") ? new Response(hwpx, { status: 200, headers: { "content-disposition": "attachment; filename*=UTF-8''%EC%95%88%EB%82%B4.hwpx" } }) : new Response("nope", { status: 404 })) as unknown as typeof fetch;
  const server = createServer({ fetchImpl });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  const client = new Client({ name: "t", version: "0" });
  await client.connect(ct);

  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["hwp_extract_tables", "hwp_info", "hwp_to_markdown"]);

  const r1 = await client.callTool({ name: "hwp_to_markdown", arguments: { base64: hwpx.toString("base64") } });
  assert.equal(r1.isError, undefined);
  assert.match((r1.content as Array<{ text: string }>)[0].text, /^<!-- document · HWPX · 4 paragraphs · 1 tables/);

  const r2 = await client.callTool({ name: "hwp_extract_tables", arguments: { url: "https://example.go.kr/files/notice.hwpx" } });
  assert.equal(r2.isError, undefined);
  const j = JSON.parse((r2.content as Array<{ text: string }>)[0].text);
  assert.equal(j.file, "안내.hwpx");
  assert.equal(j.tables[0][1][0], "장기수선충당금");

  const r3 = await client.callTool({ name: "hwp_info", arguments: { base64: Buffer.from("not a doc").toString("base64") } });
  assert.equal(r3.isError, true);
  assert.match((r3.content as Array<{ text: string }>)[0].text, /Unrecognized file/);

  const r4 = await client.callTool({ name: "hwp_info", arguments: { path: "/nonexistent/x.hwp", url: "https://a/b.hwp" } });
  assert.equal(r4.isError, true);
  assert.match((r4.content as Array<{ text: string }>)[0].text, /exactly one/);
});

test("hostile HWPX: huge declared table size is clamped, entity declarations refused, unrelated parts ignored", async () => {
  const { zipSync, strToU8 } = await import("fflate");
  const { convert } = await import("../src/convert.js");
  const sec = (body: string) => `<?xml version="1.0" encoding="UTF-8"?><hs:sec xmlns:hs="h" xmlns:hp="p"><hp:p><hp:run>${body}</hp:run></hp:p></hs:sec>`;
  const tbl = `<hp:tbl rowCnt="100000000" colCnt="100000000"><hp:tr><hp:tc><hp:cellAddr colAddr="0" rowAddr="0"/><hp:cellSpan colSpan="99999999" rowSpan="99999999"/><hp:subList><hp:p><hp:run><hp:t>x</hp:t></hp:run></hp:p></hp:subList></hp:tc></hp:tr></hp:tbl>`;
  const big = Buffer.from(zipSync({ "Contents/section0.xml": strToU8(sec(tbl)), "BinData/huge.bin": new Uint8Array(1024) }));
  const r = convert(big);
  assert.ok(r.tables.length === 1 && r.tables[0].length <= 1000 && r.tables[0][0].length <= 1000, "grid clamped to real content");
  const ent = Buffer.from(zipSync({ "Contents/section0.xml": strToU8(`<!DOCTYPE x [<!ENTITY a "aaaa">]>` + sec("<hp:t>&a;</hp:t>")) }));
  assert.throws(() => convert(ent), /entity/i);
});
