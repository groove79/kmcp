/**
 * Thin promise wrapper over the official `popbill` Node SDK (callback style: ..., success, error).
 * Only the methods the tools need are exposed, through the `Services` interface, so tests inject fakes
 * and the SDK is loaded lazily (it opens no connection until the first call).
 */
export interface PopbillError { code: number | string; message: string }

export class PopbillApiError extends Error {
  constructor(public readonly code: number | string, message: string) {
    super(message);
    this.name = "PopbillApiError";
  }
}

export interface Credentials {
  linkId: string;
  secretKey: string;
  /** 팝빌 회원 사업자번호, 10 digits */
  corpNum: string;
  userId?: string;
  isTest: boolean;
  /** Popbill's own IP restriction (default on). Turn off for machines without a fixed IP. */
  ipRestrict?: boolean;
}

/** Promise-returning subset of the SDK, grouped by service. */
export interface Services {
  taxinvoice: {
    search(args: Record<string, unknown>): Promise<unknown>;
    getDetailInfo(keyType: string, mgtKey: string): Promise<unknown>;
    registIssue(taxinvoice: Record<string, unknown>, memo?: string, forceIssue?: boolean): Promise<{ code: number; message: string; ntsConfirmNum?: string }>;
    cancelIssue(keyType: string, mgtKey: string, memo: string): Promise<{ code: number; message: string }>;
    getPopUpURL(keyType: string, mgtKey: string): Promise<string>;
  };
  hometax: {
    requestJob(queryType: "SELL" | "BUY" | "TRUSTEE", dType: "W" | "I" | "S", sDate: string, eDate: string): Promise<string>;
    getJobState(jobId: string): Promise<{ jobState: number; errorCode?: number; errorReason?: string; receiptID?: string }>;
    search(jobId: string, filters: Record<string, unknown>): Promise<unknown>;
  };
  kakao: {
    listATSTemplate(): Promise<unknown>;
    sendATS(req: { templateCode: string; sender: string; altSendType: "" | "C" | "A"; msgs: Array<{ rcv: string; rcvnm?: string; msg: string; altsjt?: string; altmsg?: string }>; btns?: unknown[] }): Promise<string>;
    getMessages(receiptNum: string): Promise<unknown>;
  };
  base: {
    getBalance(): Promise<number>;
    checkIsMember(): Promise<{ code: number; message: string }>;
  };
}

type Cb<T> = (success: (r: T) => void, error: (e: PopbillError) => void) => void;
const p = <T>(fn: Cb<T>) => new Promise<T>((resolve, reject) => fn(resolve, (e) => reject(new PopbillApiError(e?.code ?? "?", `Popbill [${e?.code}]: ${e?.message}`))));

/** Build Services from the real SDK. Called once per server. */
export async function sdkServices(c: Credentials): Promise<Services> {
  // popbill is CommonJS and its *Service() factories cache on `this`; calling them on the ESM namespace object
  // leaves `this` frozen and returns undefined. Use the real module.exports object.
  const mod = (await import("popbill")) as unknown as { default?: typeof import("popbill") } & typeof import("popbill");
  const popbill = (mod.default ?? mod) as typeof import("popbill");
  popbill.config({ LinkID: c.linkId, SecretKey: c.secretKey, IsTest: c.isTest, IPRestrictOnOff: c.ipRestrict ?? true, UseLocalTimeYN: true, defaultErrorHandler: () => undefined });
  const ti = popbill.TaxinvoiceService();
  const ht = popbill.HTTaxinvoiceService();
  const kk = popbill.KakaoService();
  if (!ti || !ht || !kk) throw new Error("Popbill SDK did not initialise (TaxinvoiceService/HTTaxinvoiceService/KakaoService returned nothing)");
  const U = c.userId;
  const N = c.corpNum;
  return {
    taxinvoice: {
      search: (a) => p((s, e) => ti.search(N, a.keyType, a.dType, a.sDate, a.eDate, a.state, a.type, a.taxType, a.lateOnly, a.order, a.page, a.perPage, null, null, null, a.qString, null, U, a.issueType, null, null, null, s, e)),
      getDetailInfo: (k, m) => p((s, e) => ti.getDetailInfo(N, k, m, U, s, e)),
      registIssue: (t, memo, force) => p((s, e) => ti.registIssue(N, t, false, force ?? false, memo ?? null, null, null, U, s, e)),
      cancelIssue: (k, m, memo) => p((s, e) => ti.cancelIssue(N, k, m, memo, U, s, e)),
      getPopUpURL: (k, m) => p((s, e) => ti.getPopUpURL(N, k, m, U, s, e)),
    },
    hometax: {
      requestJob: (q, d, sd, ed) => p((s, e) => ht.requestJob(N, q, d, sd, ed, U, s, e)),
      getJobState: (j) => p((s, e) => ht.getJobState(N, j, U, s, e)),
      search: (j, f) => p((s, e) => ht.search(N, j, f.type, f.taxType, f.purposeType, null, null, null, f.page, f.perPage, f.order, U, f.searchString, s, e)),
    },
    kakao: {
      listATSTemplate: () => p((s, e) => kk.listATSTemplate(N, U, s, e)),
      sendATS: (r) => p((s, e) => kk.sendATS_same(N, r.templateCode, r.sender, null, null, null, r.altSendType, "", r.msgs, null, r.btns ?? null, null, U, s, e)),
      getMessages: (rn) => p((s, e) => kk.getMessages(N, rn, U, s, e)),
    },
    base: {
      getBalance: () => p((s, e) => ti.getBalance(N, s, e)),
      checkIsMember: () => p((s, e) => ti.checkIsMember(N, s, e)),
    },
  };
}
