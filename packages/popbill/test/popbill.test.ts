import { test } from "node:test";
import assert from "node:assert/strict";
import type { Services } from "../src/client.js";
import { issueTaxinvoice, searchTaxinvoices, hometaxResults, sendAlimtalk, checkAccount, STATE_LABEL } from "../src/tools.js";
import { createServer } from "../src/server.js";

/** Records every call so tests assert on what reached the SDK boundary. */
function fakeServices(over: Partial<{ [K in keyof Services]: Partial<Services[K]> }> = {}) {
  const calls: Array<{ fn: string; args: unknown[] }> = [];
  const rec = <T>(fn: string, ret: T) => (...args: unknown[]) => { calls.push({ fn, args }); return Promise.resolve(ret); };
  const s: Services = {
    taxinvoice: {
      search: rec("search", { code: 1, total: 1, pageNum: 1, list: [{ invoicerMgtKey: "INV-1", stateCode: 300, writeDate: "20261021", invoicerCorpName: "앱몬스터", invoiceeCorpName: "거래처", supplyCostTotal: "100000", taxTotal: "10000", totalAmount: "110000", taxType: "과세" }] }),
      getDetailInfo: rec("getDetailInfo", { invoicerMgtKey: "INV-1" }),
      registIssue: rec("registIssue", { code: 1, message: "성공", ntsConfirmNum: "2026102141000000001" }),
      cancelIssue: rec("cancelIssue", { code: 1, message: "성공" }),
      getPopUpURL: rec("getPopUpURL", "https://popbill/view"),
      ...over.taxinvoice,
    },
    hometax: {
      requestJob: rec("requestJob", "JOB1"),
      getJobState: rec("getJobState", { jobState: 3, errorCode: 1 }),
      search: rec("htsearch", { total: 1, list: [{ ntsconfirmNum: "N1", invoicerCorpName: "공급사", totalAmount: "55000" }] }),
      ...over.hometax,
    },
    kakao: {
      listATSTemplate: rec("listATSTemplate", [{ templateCode: "T1", templateName: "주문", template: "#{고객명}님 주문이 접수됐습니다." }]),
      sendATS: rec("sendATS", "RCPT1"),
      getMessages: rec("getMessages", { state: 2 }),
      ...over.kakao,
    },
    base: { getBalance: rec("getBalance", 12345), checkIsMember: rec("checkIsMember", { code: 1, message: "회원" }), ...over.base },
  };
  return { s, calls };
}

test("issue: totals computed from items (10% VAT for 과세, floor), parties mapped, mgtKey → invoicerMgtKey", async () => {
  const { s, calls } = fakeServices();
  const out = await issueTaxinvoice.handler(s, {
    mgtKey: "INV-20261021-001", writeDate: "20261021", purposeType: "청구", taxType: "과세",
    invoicer: { corpNum: "123-45-67890", corpName: "앱몬스터", ceoName: "윤유성" },
    invoicee: { type: "사업자", corpNum: "987-65-43210", corpName: "거래처", ceoName: "김대표", email: "a@b.co" },
    items: [{ name: "앱 개발", supplyCost: 1000005 }, { name: "유지보수", supplyCost: 200000, tax: 0 }],
    forceIssue: false,
  }) as { supplyCostTotal: number; taxTotal: number; totalAmount: number; ntsConfirmNum: string; ok: boolean };
  assert.equal(out.ok, true);
  assert.equal(out.supplyCostTotal, 1200005);
  assert.equal(out.taxTotal, 100000, "floor(1000005*0.1)=100000 + explicit 0");
  assert.equal(out.totalAmount, 1300005);
  assert.equal(out.ntsConfirmNum, "2026102141000000001");
  const ti = calls.find((c) => c.fn === "registIssue")!.args[0] as Record<string, unknown>;
  assert.equal(ti.invoicerCorpNum, "1234567890");
  assert.equal(ti.invoiceeCorpNum, "9876543210");
  assert.equal(ti.invoicerMgtKey, "INV-20261021-001");
  assert.equal(ti.issueType, "정발행");
  assert.equal(ti.supplyCostTotal, "1200005");
  assert.equal((ti.detailList as unknown[]).length, 2);
});

test("issue: 면세 has zero tax by default", async () => {
  const { s } = fakeServices();
  const out = await issueTaxinvoice.handler(s, {
    mgtKey: "K", writeDate: "20261021", purposeType: "영수", taxType: "면세",
    invoicer: { corpNum: "1234567890", corpName: "a", ceoName: "b" }, invoicee: { type: "사업자", corpNum: "9876543210", corpName: "c", ceoName: "d" },
    items: [{ name: "도서", supplyCost: 30000 }], forceIssue: false,
  }) as { taxTotal: number };
  assert.equal(out.taxTotal, 0);
});

test("search maps rows and labels state codes", async () => {
  const { s, calls } = fakeServices();
  const out = await searchTaxinvoices.handler(s, { keyType: "SELL", dateType: "W", startDate: "20261001", endDate: "20261031", page: 1, perPage: 50, order: "D" }) as { total: number; invoices: Array<{ stateLabel: string; mgtKey: string }> };
  assert.equal(out.total, 1);
  assert.equal(out.invoices[0].mgtKey, "INV-1");
  assert.equal(out.invoices[0].stateLabel, STATE_LABEL[300]);
  const a = calls[0].args[0] as Record<string, unknown>;
  assert.equal(a.sDate, "20261001");
  assert.equal(a.keyType, "SELL");
});

test("hometax results: collecting → done → failed", async () => {
  const base = { jobId: "JOB1", taxTypes: ["T", "N", "Z"] as Array<"T" | "N" | "Z">, purposeTypes: ["R", "C", "N"] as Array<"R" | "C" | "N">, page: 1, perPage: 100 };
  const done = await hometaxResults.handler(fakeServices().s, base) as { state: string; invoices: unknown[] };
  assert.equal(done.state, "done");
  assert.equal(done.invoices.length, 1);

  const collecting = await hometaxResults.handler(fakeServices({ hometax: { getJobState: async () => ({ jobState: 1 }) } }).s, base) as { state: string };
  assert.equal(collecting.state, "collecting");

  const failed = await hometaxResults.handler(fakeServices({ hometax: { getJobState: async () => ({ jobState: 3, errorCode: -1, errorReason: "인증서 만료" }) } }).s, base) as { state: string; errorReason: string };
  assert.equal(failed.state, "failed");
  assert.equal(failed.errorReason, "인증서 만료");
});

test("alimtalk send: digits only for phones/sender, msgs mapped, receiptNum returned", async () => {
  const { s, calls } = fakeServices();
  const out = await sendAlimtalk.handler(s, { templateCode: "T1", sender: "02-123-4567", altSendType: "C", recipients: [{ phone: "010-1234-5678", name: "홍길동", content: "홍길동님 주문이 접수됐습니다." }] }) as { receiptNum: string; count: number };
  assert.equal(out.receiptNum, "RCPT1");
  assert.equal(out.count, 1);
  const req = calls[0].args[0] as { sender: string; msgs: Array<{ rcv: string }> };
  assert.equal(req.sender, "021234567");
  assert.equal(req.msgs[0].rcv, "01012345678");
});

test("check account: non-member skips balance", async () => {
  const { s, calls } = fakeServices({ base: { checkIsMember: async () => ({ code: 0, message: "비회원" }) } });
  const out = await checkAccount.handler(s, {}) as { isMember: boolean; balancePoints: number | null };
  assert.equal(out.isMember, false);
  assert.equal(out.balancePoints, null);
  assert.ok(!calls.some((c) => c.fn === "getBalance"));
});

test("server: write tools are refused when approveWrite says no; reads pass", async () => {
  const { s, calls } = fakeServices();
  const server = createServer({ services: s, approveWrite: async () => false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reg = (server as any)._registeredTools as Record<string, { handler: (a: unknown, extra: unknown) => Promise<{ isError?: boolean; content: Array<{ text: string }> }> }>;
  const refused = await reg.popbill_cancel_taxinvoice.handler({ keyType: "SELL", mgtKey: "K", memo: "x" }, {});
  assert.equal(refused.isError, true);
  assert.ok(!calls.some((c) => c.fn === "cancelIssue"));
  const ok = await reg.popbill_check_account.handler({}, {});
  assert.equal(ok.isError, undefined);
});
