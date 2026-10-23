import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { parseOfd, toText, invoiceFields } from "../src/ofd.js";
import { createServer } from "../src/server.js";

const NS = 'xmlns:ofd="http://www.ofdspec.org/2016"';
const tobj = (id: number, x: number, y: number, s: string) => `<ofd:TextObject ID="${id}" Boundary="${x} ${y} 40 5" Size="3.5"><ofd:TextCode X="0" Y="3">${s}</ofd:TextCode></ofd:TextObject>`;

export function sampleInvoice(opts: { tags?: boolean } = { tags: true }): Buffer {
  const files: Record<string, Uint8Array> = {
    "OFD.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><ofd:OFD ${NS} Version="1.1" DocType="OFD"><ofd:DocBody><ofd:DocInfo><ofd:DocID>abc</ofd:DocID><ofd:Title>电子发票</ofd:Title><ofd:Creator>Test</ofd:Creator></ofd:DocInfo><ofd:DocRoot>Doc_0/Document.xml</ofd:DocRoot></ofd:DocBody></ofd:OFD>`),
    "Doc_0/Document.xml": strToU8(`<ofd:Document ${NS}><ofd:CommonData><ofd:TemplatePage ID="99" BaseLoc="Tpls/Tpl_0/Content.xml"/></ofd:CommonData><ofd:Pages><ofd:Page ID="1" BaseLoc="Pages/Page_0/Content.xml"/></ofd:Pages>${opts.tags ? "<ofd:CustomTags>Tags/CustomTags.xml</ofd:CustomTags>" : ""}</ofd:Document>`),
    "Doc_0/Tpls/Tpl_0/Content.xml": strToU8(`<ofd:Page ${NS}><ofd:Content><ofd:Layer ID="2">${tobj(10, 10, 10, "电子发票（普通发票）")}${tobj(11, 10, 20, "发票号码：")}${tobj(12, 10, 30, "开票日期：")}</ofd:Layer></ofd:Content></ofd:Page>`),
    "Doc_0/Pages/Page_0/Content.xml": strToU8(`<ofd:Page ${NS}><ofd:Template TemplateID="99"/><ofd:Content><ofd:Layer ID="3">${tobj(20, 60, 20, "24312000000012345678")}${tobj(21, 60, 30, "2026年10月20日")}${tobj(22, 10, 40, "购买方：上海示例科技有限公司")}${tobj(23, 10, 50, "（小写）¥113.00")}</ofd:Layer></ofd:Content></ofd:Page>`),
  };
  if (opts.tags) {
    files["Doc_0/Tags/CustomTags.xml"] = strToU8(`<ofd:CustomTags ${NS}><ofd:CustomTag TypeID="invoice"><ofd:FileLoc>CustomTag.xml</ofd:FileLoc></ofd:CustomTag></ofd:CustomTags>`);
    files["Doc_0/Tags/CustomTag.xml"] = strToU8(`<fp:eInvoice xmlns:fp="http://www.edrm.org.cn/schema/e-invoice/2019"><fp:InvoiceNo><fp:ObjectRef PageRef="1">20</fp:ObjectRef></fp:InvoiceNo><fp:IssueDate><fp:ObjectRef PageRef="1">21</fp:ObjectRef></fp:IssueDate><fp:Buyer><fp:BuyerName>上海示例科技有限公司</fp:BuyerName></fp:Buyer><fp:TaxInclusiveTotalAmount>113.00</fp:TaxInclusiveTotalAmount></fp:eInvoice>`);
  }
  return Buffer.from(zipSync(files));
}

test("reads pages with template text in reading order", () => {
  const d = parseOfd(sampleInvoice());
  assert.equal(d.meta.title, "电子发票");
  assert.equal(d.meta.pageCount, 1);
  const t = toText(d);
  assert.match(t, /^电子发票（普通发票）\n发票号码：  24312000000012345678\n开票日期：  2026年10月20日/);
});

test("invoice fields from CustomTags (ObjectRef + direct values)", () => {
  const f = invoiceFields(parseOfd(sampleInvoice()));
  assert.equal(f.source, "tags");
  assert.equal(f.fields.invoiceNumber, "24312000000012345678");
  assert.equal(f.fields.issueDate, "2026年10月20日");
  assert.equal(f.fields.buyerName, "上海示例科技有限公司");
  assert.equal(f.fields.totalIncludingTax, "113.00");
});

test("invoice fields fall back to printed labels", () => {
  const f = invoiceFields(parseOfd(sampleInvoice({ tags: false })));
  assert.equal(f.source, "text");
  assert.equal(f.fields.invoiceNumber, "24312000000012345678");
  assert.equal(f.fields.totalIncludingTax, "113.00");
});

test("rejects non-OFD and entity declarations", () => {
  assert.throws(() => parseOfd(Buffer.from("hello")), /Not an OFD/);
  const evil = Buffer.from(zipSync({ "OFD.xml": strToU8('<!DOCTYPE x [<!ENTITY a "b">]><ofd:OFD/>') }));
  assert.throws(() => parseOfd(evil), /entity/);
});

test("MCP tools over base64", async () => {
  const server = createServer();
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  const client = new Client({ name: "t", version: "0" });
  await client.connect(ct);
  const r = await client.callTool({ name: "ofd_invoice_fields", arguments: { base64: sampleInvoice().toString("base64") } });
  const o = JSON.parse((r.content as Array<{ text: string }>)[0].text);
  assert.equal(o.fields.invoiceNumber, "24312000000012345678");
  const bad = await client.callTool({ name: "ofd_info", arguments: {} });
  assert.equal(bad.isError, true);
});
