/**
 * Recurring Korean tax & payroll filing deadlines, generated per year and shifted to the next business day
 * when they land on a weekend/holiday (국세기본법 §5 — 기한이 공휴일·토요일이면 다음 날).
 *
 * Entity profiles:
 *  - 개인(일반과세): 부가세 확정 1·7월, 예정고지 납부 4·10월, 종합소득세 5월
 *  - 개인(간이과세): 부가세 연 1회 1월 (7월 예정부과 납부는 전년 납부세액 기준 고지 시)
 *  - 법인(12월 결산): 부가세 예정+확정 분기별, 법인세 3월, 중간예납 8월
 *  - 면세사업자: 사업장현황신고 2월
 *  - 고용 있음: 원천세 매월 10일(반기납부자 1·7월), 4대보험 매월 10일, 지급명세서, 연말정산
 */
import { Calendar, parse, ymd } from "./holidays.js";

export type Entity = "individual" | "simplified" | "corporation" | "taxfree";

export interface DeadlineRule {
  id: string;
  name: string;
  category: "부가세" | "소득세" | "법인세" | "원천세" | "4대보험" | "지급명세서" | "기타";
  /** month/day pairs in the year; use 0 month for "every month" */
  dates: Array<{ month: number; day: number; note?: string }>;
  appliesTo: Entity[];
  requiresEmployees?: boolean;
  /** when the employer opted into 반기 납부 — rule replaced by 1/10 & 7/10 */
  halfYearVariant?: boolean;
  what: string;
}

const everyMonth = (day: number, note?: string) => Array.from({ length: 12 }, (_, i) => ({ month: i + 1, day, note }));

export const RULES: DeadlineRule[] = [
  { id: "vat-final-2h", name: "부가가치세 2기 확정신고·납부", category: "부가세", dates: [{ month: 1, day: 25, note: "전년 7~12월분" }], appliesTo: ["individual", "corporation"], what: "전년도 하반기 매출·매입 신고 및 납부 (홈택스)" },
  { id: "vat-final-1h", name: "부가가치세 1기 확정신고·납부", category: "부가세", dates: [{ month: 7, day: 25, note: "1~6월분" }], appliesTo: ["individual", "corporation"], what: "상반기 매출·매입 신고 및 납부" },
  { id: "vat-prelim-1", name: "부가가치세 1기 예정신고·납부", category: "부가세", dates: [{ month: 4, day: 25, note: "1~3월분" }], appliesTo: ["corporation"], what: "법인 분기 예정신고. 개인 일반과세자는 예정고지서 납부(직전 납부세액의 1/2)" },
  { id: "vat-prelim-2", name: "부가가치세 2기 예정신고·납부", category: "부가세", dates: [{ month: 10, day: 25, note: "7~9월분" }], appliesTo: ["corporation"], what: "법인 분기 예정신고" },
  { id: "vat-prelim-notice-1", name: "부가가치세 예정고지 납부", category: "부가세", dates: [{ month: 4, day: 25 }], appliesTo: ["individual"], what: "개인 일반과세자: 직전 확정 납부세액의 50% 고지분 납부 (고지세액 50만원 미만은 생략)" },
  { id: "vat-prelim-notice-2", name: "부가가치세 예정고지 납부", category: "부가세", dates: [{ month: 10, day: 25 }], appliesTo: ["individual"], what: "개인 일반과세자: 예정고지분 납부" },
  { id: "vat-simplified", name: "부가가치세 신고·납부 (간이과세자)", category: "부가세", dates: [{ month: 1, day: 25, note: "전년 1~12월분" }], appliesTo: ["simplified"], what: "간이과세자 연 1회 확정신고. 7/25 예정부과 고지 시 납부" },
  { id: "vat-simplified-prelim", name: "부가가치세 예정부과 납부 (간이과세자)", category: "부가세", dates: [{ month: 7, day: 25 }], appliesTo: ["simplified"], what: "직전 과세기간 납부세액의 50% 고지분 (고지 시)" },
  { id: "taxfree-status", name: "면세사업자 사업장현황신고", category: "기타", dates: [{ month: 2, day: 10 }], appliesTo: ["taxfree"], what: "전년도 수입금액·시설현황 신고 (의료·교육·농축산 등 면세사업자)" },
  { id: "income-tax", name: "종합소득세 확정신고·납부", category: "소득세", dates: [{ month: 5, day: 31 }], appliesTo: ["individual", "simplified", "taxfree"], what: "전년도 종합소득 신고 (성실신고확인대상자는 6/30). 지방소득세 동시 신고" },
  { id: "income-tax-interim", name: "종합소득세 중간예납 납부", category: "소득세", dates: [{ month: 11, day: 30 }], appliesTo: ["individual", "simplified", "taxfree"], what: "전년 납부세액의 1/2 고지분 (고지세액 50만원 미만 생략)" },
  { id: "corp-tax", name: "법인세 신고·납부", category: "법인세", dates: [{ month: 3, day: 31, note: "12월 결산법인" }], appliesTo: ["corporation"], what: "사업연도 종료일로부터 3개월 이내. 지방소득세 법인세분은 4/30" },
  { id: "corp-local-tax", name: "법인지방소득세 신고·납부", category: "법인세", dates: [{ month: 4, day: 30, note: "12월 결산법인" }], appliesTo: ["corporation"], what: "사업연도 종료일로부터 4개월 이내, 사업장 소재 지자체" },
  { id: "corp-tax-interim", name: "법인세 중간예납", category: "법인세", dates: [{ month: 8, day: 31, note: "12월 결산법인" }], appliesTo: ["corporation"], what: "상반기분 중간예납 (직전 사업연도 산출세액 기준 또는 가결산)" },
  { id: "withholding", name: "원천세 신고·납부", category: "원천세", dates: everyMonth(10, "전월 지급분"), appliesTo: ["individual", "simplified", "corporation", "taxfree"], requiresEmployees: true, halfYearVariant: true, what: "전월 급여·사업소득·기타소득 원천징수분 신고·납부. 반기납부 승인 사업자는 1/10·7/10" },
  { id: "social-insurance", name: "4대보험료 납부", category: "4대보험", dates: everyMonth(10, "당월분 고지"), appliesTo: ["individual", "simplified", "corporation", "taxfree"], requiresEmployees: true, what: "국민연금·건강보험·고용보험·산재보험 고지분 납부 (자동이체 권장)" },
  { id: "daily-worker-statement", name: "일용근로소득 지급명세서 제출", category: "지급명세서", dates: everyMonth(31, "전월 지급분, 말일"), appliesTo: ["individual", "simplified", "corporation", "taxfree"], requiresEmployees: true, what: "일용직 지급 시 매월 말일까지 (미제출 가산세)" },
  { id: "simple-statement", name: "간이지급명세서(근로·사업소득) 제출", category: "지급명세서", dates: everyMonth(31, "전월 지급분, 말일"), appliesTo: ["individual", "simplified", "corporation", "taxfree"], requiresEmployees: true, what: "근로소득·원천징수 대상 사업소득 매월 제출 (2026년 귀속부터 근로소득 매월)" },
  { id: "year-end", name: "연말정산 지급명세서 제출", category: "지급명세서", dates: [{ month: 3, day: 10, note: "전년 귀속" }], appliesTo: ["individual", "simplified", "corporation", "taxfree"], requiresEmployees: true, what: "근로·퇴직·사업·기타소득 지급명세서 제출. 2월 급여에 연말정산 환급/추징 반영" },
  { id: "insurance-wage-report", name: "4대보험 보수총액 신고", category: "4대보험", dates: [{ month: 3, day: 15, note: "건강보험·고용/산재" }], appliesTo: ["individual", "simplified", "corporation", "taxfree"], requiresEmployees: true, what: "전년도 보수총액 신고 → 4월 보험료 정산. 국민연금은 소득총액신고 5/31" },
  { id: "property-tax-1", name: "재산세 납부 (건축물·주택 1/2)", category: "기타", dates: [{ month: 7, day: 31 }], appliesTo: ["individual", "simplified", "corporation", "taxfree"], what: "사업장 소유 시. 주택분 2기는 9/30, 토지는 9/30" },
  { id: "property-tax-2", name: "재산세 납부 (토지·주택 2/2)", category: "기타", dates: [{ month: 9, day: 30 }], appliesTo: ["individual", "simplified", "corporation", "taxfree"], what: "사업장·토지 소유 시" },
  { id: "registration-license", name: "등록면허세 납부", category: "기타", dates: [{ month: 1, day: 31 }], appliesTo: ["individual", "simplified", "corporation", "taxfree"], what: "인허가 보유 사업자 (면허분, 매년 1월 정기분)" },
];

export interface Deadline {
  date: string;
  originalDate: string;
  shifted: boolean;
  id: string;
  name: string;
  category: DeadlineRule["category"];
  note?: string;
  what: string;
}

const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function deadlinesForYear(year: number, opts: { entity: Entity; employees: boolean; withholdingHalfYear?: boolean; calendar?: Calendar }): Deadline[] {
  const cal = opts.calendar ?? new Calendar();
  const out: Deadline[] = [];
  for (const r of RULES) {
    if (!r.appliesTo.includes(opts.entity)) continue;
    if (r.requiresEmployees && !opts.employees) continue;
    let dates = r.dates;
    if (r.halfYearVariant && opts.withholdingHalfYear) dates = [{ month: 1, day: 10, note: "전년 7~12월분 (반기납부)" }, { month: 7, day: 10, note: "1~6월분 (반기납부)" }];
    for (const d of dates) {
      const day = Math.min(d.day, lastDay(year, d.month));
      const orig = parse(`${year}-${String(d.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
      const eff = cal.nextBusinessDay(orig, true);
      out.push({ date: ymd(eff), originalDate: ymd(orig), shifted: eff.getTime() !== orig.getTime(), id: r.id, name: r.name, category: r.category, note: d.note, what: r.what });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
