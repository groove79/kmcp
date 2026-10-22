#!/usr/bin/env node
/**
 * Popbill live smoke test (TEST environment only).
 *   node scripts/live-test.mjs          → 회원·포인트·인증서 만료일 확인
 *   node scripts/live-test.mjs issue    → + 테스트 매출 세금계산서 1건 발행 후 상태 조회
 * Reads /Volumes/Dev/.secrets/popbill.env (or POPBILL_ENV_FILE).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { sdkServices, tools } from "../dist/index.js";

const envFile = process.env.POPBILL_ENV_FILE ?? "/Volumes/Dev/.secrets/popbill.env";
for (const line of readFileSync(envFile, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const E = process.env;
const isTest = (E.POPBILL_TEST ?? "1") !== "0" && E.POPBILL_TEST !== "false";
if (!isTest) { console.error("POPBILL_TEST가 운영으로 되어 있어 중단합니다 (이 스크립트는 테스트 환경 전용)."); process.exit(1); }
const cred = { linkId: E.POPBILL_LINK_ID, secretKey: E.POPBILL_SECRET_KEY, corpNum: E.POPBILL_CORP_NUM, userId: E.POPBILL_USER_ID, isTest: true, ipRestrict: false };

const s = await sdkServices(cred);
const tool = (n) => tools.find((t) => t.name === n);

console.log("1) 계정:", JSON.stringify(await tool("popbill_check_account").handler(s, {})));

const popbill = createRequire(import.meta.url)("popbill");
const ti = popbill.TaxinvoiceService();
const cert = await new Promise((ok) => ti.getCertificateExpireDate(cred.corpNum, cred.userId ?? "", (r) => ok({ expires: r }), (e) => ok({ error: `[${e.code}] ${e.message}` })));
console.log("2) 인증서:", JSON.stringify(cert));
if (cert.error) process.exit(1);

if (process.argv[2] === "issue") {
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date();
  const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const mgtKey = `TEST-${ymd}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const r = await tool("popbill_issue_taxinvoice").handler(s, {
    mgtKey, writeDate: ymd, purposeType: "청구", taxType: "과세", forceIssue: false,
    invoicer: { corpNum: cred.corpNum, corpName: "앱몬스터", ceoName: "김유미", addr: "인천광역시 검단구 완정로34번길 20", bizType: "정보통신업", bizClass: "응용 소프트웨어 개발 및 공급업", contactName: "윤유성", email: "appmonster.kr@gmail.com" },
    invoicee: { type: "사업자", corpNum: "8888888888", corpName: "테스트 거래처", ceoName: "테스트", email: "appmonster.kr@gmail.com" },
    items: [{ name: "K-MCP 연동 테스트", qty: 1, unitCost: 10000, supplyCost: 10000 }],
    remark: "팝빌 테스트 환경 발행",
  });
  console.log("3) 발행:", JSON.stringify(r));
  if (r.ok) {
    const info = await tool("popbill_get_taxinvoice").handler(s, { keyType: "SELL", mgtKey });
    console.log("4) 조회:", info.invoice?.invoicerMgtKey ?? mgtKey, "| 합계", info.invoice?.totalAmount, "| 보기:", info.viewUrl ?? "-");
  }
}
