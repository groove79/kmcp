/**
 * Popbill tools. Naming: popbill_<verb>_<object>. Description: EN first, KO second, "Use when…" / "Needs…".
 * Access: read | write. Writes (issue, cancel, 알림톡 send) cost Popbill points and/or report to the NTS — gated by approveWrite.
 */
import { z } from "zod";
import type { Services } from "./client.js";

export type Access = "read" | "write";
export interface ToolDef<S extends z.ZodRawShape> {
  name: string;
  description: string;
  access: Access;
  schema: S;
  handler: (s: Services, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

const ymd = z.string().regex(/^\d{8}$/).describe("yyyyMMdd");
const digits = (s: string) => s.replace(/\D/g, "");

/** 세금계산서 상태코드 → 사람이 읽는 라벨 (주요 코드만) */
export const STATE_LABEL: Record<number, string> = {
  100: "임시저장", 101: "임시저장(수정)", 150: "발행대기", 200: "발행예정", 300: "발행완료", 301: "발행완료(수정)",
  320: "발행취소", 410: "수정(수정분)", 600: "국세청 전송중", 601: "국세청 전송완료", 602: "국세청 전송실패", 603: "국세청 전송중단",
};

export const checkAccount = define({
  name: "popbill_check_account",
  access: "read",
  description:
    "Check the Popbill connection: membership of the configured business number and remaining point balance. " +
    "팝빌 회원 여부와 포인트 잔액을 확인합니다. Use first, or when an issue/send fails. Needs nothing.",
  schema: {},
  handler: async (s) => {
    const member = await s.base.checkIsMember();
    const balance = member.code === 1 ? await s.base.getBalance() : null;
    return { isMember: member.code === 1, message: member.message, balancePoints: balance };
  },
});

export const searchTaxinvoices = define({
  name: "popbill_search_taxinvoices",
  access: "read",
  description:
    "Search e-tax invoices (전자세금계산서) issued through Popbill — sales (SELL) or purchases (BUY) — by date range, state, and free text. " +
    "팝빌에서 발행·수신한 세금계산서를 검색합니다. Use for '이번 달 발행한 세금계산서', unsent/failed NTS transmissions, or finding a mgtKey before cancelling. Needs keyType and dates; dateType W=작성일 R=등록일 I=발행일.",
  schema: {
    keyType: z.enum(["SELL", "BUY", "TRUSTEE"]).default("SELL"),
    dateType: z.enum(["W", "R", "I"]).default("W"),
    startDate: ymd,
    endDate: ymd,
    states: z.array(z.string()).optional().describe("State codes, e.g. [\"3**\"] 발행완료 계열, [\"6**\"] 국세청 전송 계열"),
    taxTypes: z.array(z.enum(["T", "N", "Z"])).optional().describe("T 과세 N 면세 Z 영세"),
    query: z.string().optional().describe("Free text: 거래처 상호 or 사업자번호"),
    page: z.number().int().min(1).default(1),
    perPage: z.number().int().min(1).max(1000).default(50),
    order: z.enum(["D", "A"]).default("D"),
  },
  handler: async (s, a) => {
    const res = (await s.taxinvoice.search({
      keyType: a.keyType, dType: a.dateType, sDate: a.startDate, eDate: a.endDate, state: a.states ?? null, type: null, taxType: a.taxTypes ?? null,
      lateOnly: null, order: a.order, page: a.page, perPage: a.perPage, qString: a.query ?? null, issueType: null,
    })) as { code?: number; total?: number; pageNum?: number; list?: Array<Record<string, unknown>> };
    return {
      total: res.total ?? 0,
      page: res.pageNum ?? a.page,
      invoices: (res.list ?? []).map((t) => ({
        mgtKey: t.invoicerMgtKey ?? t.invoiceeMgtKey ?? t.trusteeMgtKey,
        ntsConfirmNum: t.ntsconfirmNum,
        state: t.stateCode, stateLabel: STATE_LABEL[Number(t.stateCode)] ?? String(t.stateCode),
        writeDate: t.writeDate, issueDT: t.issueDT,
        taxType: t.taxType, purposeType: t.purposeType,
        supplier: { corpNum: t.invoicerCorpNum, name: t.invoicerCorpName },
        buyer: { corpNum: t.invoiceeCorpNum, name: t.invoiceeCorpName },
        supplyCostTotal: t.supplyCostTotal, taxTotal: t.taxTotal, totalAmount: t.totalAmount,
        ntsResult: t.ntsresult, modifyCode: t.modifyCode,
      })),
    };
  },
});

export const getTaxinvoice = define({
  name: "popbill_get_taxinvoice",
  access: "read",
  description:
    "Get one e-tax invoice in full (parties, line items, amounts, NTS confirmation number, state) plus a Popbill view URL. " +
    "세금계산서 1건의 상세를 조회합니다. Use after popbill_search_taxinvoices. Needs keyType and the mgtKey (문서번호).",
  schema: { keyType: z.enum(["SELL", "BUY", "TRUSTEE"]).default("SELL"), mgtKey: z.string().min(1).max(24) },
  handler: async (s, a) => {
    const [detail, url] = await Promise.all([s.taxinvoice.getDetailInfo(a.keyType, a.mgtKey), s.taxinvoice.getPopUpURL(a.keyType, a.mgtKey).catch(() => null)]);
    return { invoice: detail, viewUrl: url };
  },
});

const itemSchema = z.object({
  name: z.string().min(1).max(100).describe("품목명"),
  spec: z.string().max(100).optional().describe("규격"),
  qty: z.number().positive().optional(),
  unitCost: z.number().int().optional().describe("단가 (원)"),
  supplyCost: z.number().int().min(0).describe("공급가액 (원)"),
  tax: z.number().int().min(0).optional().describe("세액 — omitted → 10% of supplyCost for 과세, 0 for 면세/영세"),
  purchaseDT: ymd.optional().describe("거래일자, default writeDate"),
  remark: z.string().max(100).optional(),
});

export const issueTaxinvoice = define({
  name: "popbill_issue_taxinvoice",
  access: "write",
  description:
    "Issue a sales e-tax invoice (정발행 세금계산서) in one step: saved + issued, emailed to the buyer, then reported to the NTS (국세청). Costs Popbill points. Totals are computed from the items. " +
    "매출 세금계산서를 즉시 발행합니다. Use when the sale is confirmed and the buyer's business number is verified. Needs the supplier (invoicer) and buyer (invoicee) parties, writeDate, and at least one item. Register the supplier's 공동인증서 in Popbill first.",
  schema: {
    mgtKey: z.string().min(1).max(24).describe("Your unique document number (문서번호), e.g. INV-20261021-001"),
    writeDate: ymd.describe("작성일자"),
    purposeType: z.enum(["영수", "청구", "없음"]).default("청구"),
    taxType: z.enum(["과세", "영세", "면세"]).default("과세"),
    invoicer: z.object({
      corpNum: z.string().min(10), corpName: z.string().min(1), ceoName: z.string().min(1),
      addr: z.string().optional(), bizType: z.string().optional().describe("업태"), bizClass: z.string().optional().describe("종목"),
      contactName: z.string().optional(), email: z.string().email().optional(), tel: z.string().optional(),
    }).describe("공급자 (팝빌 회원 사업자)"),
    invoicee: z.object({
      type: z.enum(["사업자", "개인", "외국인"]).default("사업자"),
      corpNum: z.string().min(1).describe("사업자번호 (개인은 주민번호 뒷자리 제외 가능)"), corpName: z.string().min(1), ceoName: z.string().min(1),
      addr: z.string().optional(), bizType: z.string().optional(), bizClass: z.string().optional(),
      contactName: z.string().optional(), email: z.string().email().optional().describe("발행 메일 수신처"), tel: z.string().optional(),
    }).describe("공급받는자"),
    items: z.array(itemSchema).min(1).max(99),
    remark: z.string().max(150).optional().describe("비고"),
    memo: z.string().max(200).optional().describe("Popbill memo (not on the invoice)"),
    forceIssue: z.boolean().default(false).describe("Issue even if the buyer's 사업자번호 looks closed/suspended"),
  },
  handler: async (s, a) => {
    const taxRate = a.taxType === "과세" ? 0.1 : 0;
    const detailList = a.items.map((it, i) => {
      const tax = it.tax ?? Math.floor(it.supplyCost * taxRate);
      return {
        serialNum: i + 1, purchaseDT: it.purchaseDT ?? a.writeDate, itemName: it.name, spec: it.spec, qty: it.qty !== undefined ? String(it.qty) : undefined,
        unitCost: it.unitCost !== undefined ? String(it.unitCost) : undefined, supplyCost: String(it.supplyCost), tax: String(tax), remark: it.remark,
      };
    });
    const supplyCostTotal = a.items.reduce((n, it) => n + it.supplyCost, 0);
    const taxTotal = detailList.reduce((n, d) => n + Number(d.tax), 0);
    const inv = a.invoicer, ee = a.invoicee;
    const taxinvoice = {
      writeDate: a.writeDate, chargeDirection: "정과금", issueType: "정발행", purposeType: a.purposeType, taxType: a.taxType,
      invoicerCorpNum: digits(inv.corpNum), invoicerMgtKey: a.mgtKey, invoicerCorpName: inv.corpName, invoicerCEOName: inv.ceoName, invoicerAddr: inv.addr,
      invoicerBizType: inv.bizType, invoicerBizClass: inv.bizClass, invoicerContactName: inv.contactName, invoicerEmail: inv.email, invoicerTEL: inv.tel, invoicerSMSSendYN: false,
      invoiceeType: ee.type, invoiceeCorpNum: digits(ee.corpNum), invoiceeCorpName: ee.corpName, invoiceeCEOName: ee.ceoName, invoiceeAddr: ee.addr,
      invoiceeBizType: ee.bizType, invoiceeBizClass: ee.bizClass, invoiceeContactName1: ee.contactName, invoiceeEmail1: ee.email, invoiceeTEL1: ee.tel,
      supplyCostTotal: String(supplyCostTotal), taxTotal: String(taxTotal), totalAmount: String(supplyCostTotal + taxTotal),
      modifyCode: null, remark1: a.remark, detailList,
    };
    const res = await s.taxinvoice.registIssue(taxinvoice, a.memo, a.forceIssue);
    return { ok: res.code === 1, message: res.message, ntsConfirmNum: res.ntsConfirmNum ?? null, mgtKey: a.mgtKey, supplyCostTotal, taxTotal, totalAmount: supplyCostTotal + taxTotal };
  },
});

export const cancelTaxinvoice = define({
  name: "popbill_cancel_taxinvoice",
  access: "write",
  description:
    "Cancel an issued e-tax invoice (발행취소) before it is transmitted to the NTS; after transmission a 수정세금계산서 is required instead. " +
    "발행완료 상태의 세금계산서를 발행취소합니다. Use when an invoice was issued by mistake and its state is 3xx (not yet 6xx). Needs keyType, mgtKey, and a memo.",
  schema: { keyType: z.enum(["SELL", "BUY", "TRUSTEE"]).default("SELL"), mgtKey: z.string().min(1).max(24), memo: z.string().min(1).max(200) },
  handler: async (s, a) => {
    const res = await s.taxinvoice.cancelIssue(a.keyType, a.mgtKey, a.memo);
    return { ok: res.code === 1, message: res.message };
  },
});

export const hometaxRequest = define({
  name: "popbill_hometax_request",
  access: "read",
  description:
    "Start a Hometax (홈택스) collection job for e-tax invoices issued OUTSIDE Popbill too — sales or purchases in a date range (max 6 months). Returns a jobId; collection takes a few seconds to minutes. " +
    "홈택스에서 매출/매입 세금계산서를 수집하는 작업을 요청합니다. Use for bookkeeping, VAT prep (부가세 신고), or checking what suppliers billed you. Needs queryType SELL/BUY and dates (dateType W=작성일 I=발급일 S=전송일). Hometax 공동인증서 or 부서사용자 must be registered in Popbill.",
  schema: { queryType: z.enum(["SELL", "BUY", "TRUSTEE"]).default("BUY"), dateType: z.enum(["W", "I", "S"]).default("W"), startDate: ymd, endDate: ymd },
  handler: async (s, a) => {
    const jobId = await s.hometax.requestJob(a.queryType, a.dateType, a.startDate, a.endDate);
    return { jobId, next: "Call popbill_hometax_results with this jobId; if state is still 'collecting', wait and call again." };
  },
});

export const hometaxResults = define({
  name: "popbill_hometax_results",
  access: "read",
  description:
    "Read the results of a Hometax collection job: state (collecting / done / failed) and, when done, the collected invoices with parties, amounts, NTS numbers, paged. " +
    "홈택스 수집 작업 결과를 조회합니다. Use after popbill_hometax_request. Needs jobId; optional filters taxType (T/N/Z), purposeType (R 영수/C 청구/N 없음), query.",
  schema: {
    jobId: z.string().min(1),
    taxTypes: z.array(z.enum(["T", "N", "Z"])).default(["T", "N", "Z"]),
    purposeTypes: z.array(z.enum(["R", "C", "N"])).default(["R", "C", "N"]),
    query: z.string().optional(),
    page: z.number().int().min(1).default(1),
    perPage: z.number().int().min(1).max(1000).default(100),
  },
  handler: async (s, a) => {
    const st = await s.hometax.getJobState(a.jobId);
    if (st.jobState === 1 || st.jobState === 2) return { state: "collecting", jobState: st.jobState };
    if (st.jobState !== 3) return { state: "failed", jobState: st.jobState, errorCode: st.errorCode, errorReason: st.errorReason };
    if (st.errorCode !== undefined && st.errorCode !== 1) return { state: "failed", jobState: 3, errorCode: st.errorCode, errorReason: st.errorReason };
    const res = (await s.hometax.search(a.jobId, { type: ["N", "M"], taxType: a.taxTypes, purposeType: a.purposeTypes, page: a.page, perPage: a.perPage, order: "D", searchString: a.query ?? null })) as { total?: number; list?: Array<Record<string, unknown>> };
    return {
      state: "done",
      total: res.total ?? 0,
      invoices: (res.list ?? []).map((t) => ({
        ntsConfirmNum: t.ntsconfirmNum, writeDate: t.writeDate, issueDate: t.issueDate, sendDate: t.sendDate,
        taxType: t.taxType, purposeType: t.purposeType, modifyYN: t.modifyYn,
        supplier: { corpNum: t.invoicerCorpNum, name: t.invoicerCorpName, ceo: t.invoicerCEOName },
        buyer: { corpNum: t.invoiceeCorpNum, name: t.invoiceeCorpName, ceo: t.invoiceeCEOName },
        supplyCostTotal: t.supplyCostTotal, taxTotal: t.taxTotal, totalAmount: t.totalAmount,
        itemName: t.itemName, remark: t.remark1,
      })),
    };
  },
});

export const listAlimtalkTemplates = define({
  name: "popbill_list_alimtalk_templates",
  access: "read",
  description:
    "List approved KakaoTalk 알림톡 templates (code, content with #{variables}, buttons) registered for this Popbill member. " +
    "승인된 알림톡 템플릿 목록을 조회합니다. Use before popbill_send_alimtalk to pick a templateCode and see its variables. Needs nothing.",
  schema: {},
  handler: async (s) => {
    const list = (await s.kakao.listATSTemplate()) as Array<Record<string, unknown>>;
    return (list ?? []).map((t) => ({ templateCode: t.templateCode, templateName: t.templateName, template: t.template, plusFriendID: t.plusFriendID, state: t.state, btns: t.btns, secureYN: t.secureYN }));
  },
});

export const sendAlimtalk = define({
  name: "popbill_send_alimtalk",
  access: "write",
  description:
    "Send KakaoTalk 알림톡 (official business notification) to up to 1,000 phone numbers using an approved template; falls back to SMS/LMS when the recipient can't receive it. Costs points per message. " +
    "승인된 템플릿으로 알림톡을 발송합니다. Use for order/shipping/approval notices to customers. Needs templateCode, the registered sender number, and recipients with the template text filled in (variables substituted — must match the template exactly).",
  schema: {
    templateCode: z.string().min(1),
    sender: z.string().min(9).describe("Registered 발신번호"),
    altSendType: z.enum(["", "C", "A"]).default("C").describe("Fallback when undeliverable: '' none, C = same content as SMS/LMS, A = alt content"),
    recipients: z.array(z.object({
      phone: z.string().min(9),
      name: z.string().optional(),
      content: z.string().min(1).max(1000).describe("Template text with variables filled"),
      altSubject: z.string().optional(),
      altContent: z.string().optional().describe("Used when altSendType = A"),
    })).min(1).max(1000),
  },
  handler: async (s, a) => {
    const receiptNum = await s.kakao.sendATS({
      templateCode: a.templateCode, sender: digits(a.sender), altSendType: a.altSendType,
      msgs: a.recipients.map((r) => ({ rcv: digits(r.phone), rcvnm: r.name, msg: r.content, altsjt: r.altSubject, altmsg: r.altContent })),
    });
    return { receiptNum, count: a.recipients.length, next: "Check delivery with popbill_get_alimtalk_result." };
  },
});

export const getAlimtalkResult = define({
  name: "popbill_get_alimtalk_result",
  access: "read",
  description:
    "Get delivery results for an 알림톡 send by receiptNum: per-recipient state, result code, send/receive times, fallback used. " +
    "알림톡 발송 결과를 조회합니다. Use a minute after popbill_send_alimtalk. Needs receiptNum.",
  schema: { receiptNum: z.string().min(1) },
  handler: async (s, { receiptNum }) => s.kakao.getMessages(receiptNum),
});

export const tools = [checkAccount, searchTaxinvoices, getTaxinvoice, issueTaxinvoice, cancelTaxinvoice, hometaxRequest, hometaxResults, listAlimtalkTemplates, sendAlimtalk, getAlimtalkResult] as const;
