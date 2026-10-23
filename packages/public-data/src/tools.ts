import { z } from "zod";
import type { PublicClient } from "./client.js";
import { romanizeName } from "./romanize.js";

export type Access = "read" | "write";
export interface ToolDef<S extends z.ZodRawShape> {
  name: string; description: string; access: Access; schema: S;
  handler: (client: PublicClient, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

const digits = (s: string) => s.replace(/\D/g, "");

/** 국세청 사업자등록 상태조회 (odcloud) */
export const checkBusiness = define({
  name: "kr_check_business",
  access: "read",
  description:
    "Check Korean business registration numbers (사업자등록번호) with the National Tax Service: active / suspended / closed, tax type, closure date. Up to 100 numbers per call. " +
    "사업자 상태를 조회합니다. Use before registering a vendor or customer. Needs 10-digit numbers (dashes OK).",
  schema: {
    numbers: z.array(z.string().min(10)).min(1).max(100).describe("Business numbers, e.g. \"123-45-67890\""),
  },
  handler: async (c, { numbers }) => {
    const key = c.requireKey("dataGoKr", "DATA_GO_KR_KEY", "https://www.data.go.kr (국세청_사업자등록정보 진위확인 및 상태조회 서비스 활용신청)");
    const url = new URL("https://api.odcloud.kr/api/nts-businessman/v1/status");
    url.searchParams.set("serviceKey", key);
    const b_no = numbers.map(digits);
    const bad = b_no.filter((n) => n.length !== 10);
    if (bad.length) throw new Error(`Invalid business numbers (need 10 digits): ${bad.join(", ")}`);
    const res = await c.postJson<{ data?: Array<Record<string, string>> }>(url, { b_no });
    const label: Record<string, string> = { "01": "계속사업자(active)", "02": "휴업자(suspended)", "03": "폐업자(closed)" };
    return (res.data ?? []).map((d) => ({
      b_no: d.b_no,
      status: label[d.b_stt_cd] ?? (d.b_stt || "등록되지 않은 번호(not registered)"),
      status_code: d.b_stt_cd || null,
      tax_type: d.tax_type,
      closed_on: d.end_dt || null,
      utcc_yn: d.utcc_yn,
    }));
  },
});

/** 한국천문연구원 특일 정보 — 공휴일 */
export const holidays = define({
  name: "kr_holidays",
  access: "read",
  description:
    "List Korean public holidays (incl. substitute holidays) for a year or a month, from the official KASI calendar. " +
    "공휴일·대체공휴일을 조회합니다. Use for delivery estimates, deadlines, scheduling. Needs year; month optional.",
  schema: {
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12).optional(),
  },
  handler: async (c, { year, month }) => {
    const key = c.requireKey("dataGoKr", "DATA_GO_KR_KEY", "https://www.data.go.kr (한국천문연구원_특일 정보제공 서비스 활용신청)");
    const months = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);
    const out: Array<{ date: string; name: string; isHoliday: boolean }> = [];
    for (const m of months) {
      const url = new URL("https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo");
      url.searchParams.set("serviceKey", key);
      url.searchParams.set("solYear", String(year));
      url.searchParams.set("solMonth", String(m).padStart(2, "0"));
      url.searchParams.set("_type", "json");
      url.searchParams.set("numOfRows", "50");
      const j = await c.getJson<{ response: { body: { items: { item?: Array<{ locdate: number; dateName: string; isHoliday: string }> | { locdate: number; dateName: string; isHoliday: string } } | "" } } }>(url);
      const items = j.response.body.items;
      const list = !items ? [] : Array.isArray(items.item) ? items.item : items.item ? [items.item] : [];
      for (const it of list) out.push({ date: String(it.locdate).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"), name: it.dateName, isHoliday: it.isHoliday === "Y" });
    }
    return { year, month: month ?? null, count: out.length, holidays: out };
  },
});

/** 행안부 도로명주소 검색 (juso.go.kr) */
export const searchAddress = define({
  name: "kr_search_address",
  access: "read",
  description:
    "Search and normalize a Korean address: returns road address, lot address, postal code, building name. " +
    "주소를 검색·정규화합니다(도로명·지번·우편번호). Use to validate shipping or business addresses. Needs a keyword like \"테헤란로 152\" or a building name.",
  schema: {
    keyword: z.string().min(2),
    count: z.number().int().min(1).max(50).default(10),
  },
  handler: async (c, { keyword, count }) => {
    const key = c.requireKey("juso", "JUSO_KEY", "https://business.juso.go.kr (도로명주소 API 신청, 무료)");
    const url = new URL("https://business.juso.go.kr/addrlink/addrLinkApi.do");
    url.searchParams.set("confmKey", key);
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("currentPage", "1");
    url.searchParams.set("countPerPage", String(count));
    url.searchParams.set("resultType", "json");
    const j = await c.getJson<{ results: { common: { errorCode: string; errorMessage: string; totalCount: string }; juso?: Array<Record<string, string>> } }>(url);
    if (j.results.common.errorCode !== "0") throw new Error(`juso.go.kr error ${j.results.common.errorCode}: ${j.results.common.errorMessage}`);
    return {
      total: Number(j.results.common.totalCount),
      results: (j.results.juso ?? []).map((a) => ({
        roadAddress: a.roadAddr, roadAddressShort: a.roadAddrPart1, lotAddress: a.jibunAddr, postalCode: a.zipNo,
        building: a.bdNm || null, sido: a.siNm, sigungu: a.sggNm, dong: a.emdNm, englishAddress: a.engAddr,
        buildingManagementNo: a.bdMgtSn, adminCode: a.admCd,
      })),
    };
  },
});

/** Split "서울 강남구 테헤란로 152 101동 1203호 (역삼동, 래미안)" into the part juso can search and the unit detail. */
export function splitKoreanAddress(input: string): { base: string; detail: string } {
  const s = input.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const road = s.match(/^(.*?(?:로|길)\s*\d+(?:-\d+)?)(?=\s|,|$)(.*)$/);
  if (road) return { base: road[1].trim(), detail: road[2].replace(/^[,\s]+/, "").trim() };
  const lot = s.match(/^(.*?(?:동|리|가)\s*(?:산\s*)?\d+(?:-\d+)?)(?=\s|,|$)(.*)$/);
  if (lot) return { base: lot[1].trim(), detail: lot[2].replace(/^[,\s]+/, "").trim() };
  return { base: s, detail: "" };
}

/** "101동 1203호" → { unit: "101-dong 1203-ho", ... } plus any named building, romanized. */
export function englishDetail(detail: string): { unit: string | null; name: string | null } {
  let rest = detail;
  const parts: string[] = [];
  const take = (re: RegExp, fmt: (m: RegExpMatchArray) => string) => { const m = rest.match(re); if (m) { parts.push(fmt(m)); rest = rest.replace(m[0], " "); } };
  take(/([A-Za-z]?\d+)\s*동(?![가-힣])/, (m) => `${m[1]}-dong`);
  take(/지하\s*(\d+)\s*층/, (m) => `B${m[1]}F`);
  take(/(\d+)\s*층/, (m) => `${m[1]}F`);
  take(/([A-Za-z]?\d+(?:-\d+)?)\s*호/, (m) => `${m[1]}-ho`);
  const left = rest.replace(/[,\s]+/g, " ").trim();
  const name = left && /[가-힣]/.test(left) ? romanizeName(left) : left || null;
  return { unit: parts.length ? parts.join(" ") : null, name };
}

/**
 * Parse juso's engAddr into shipping-form fields. juso writes "152 Teheran-ro, Gangnam-gu, Seoul"
 * (older data: "152, Teheran-ro, …"). Line 1 = number + road + district; city = -si/-gun inside a -do, else the metropolitan city.
 */
export function shippingFields(engAddr: string) {
  const p = engAddr.split(",").map((x) => x.trim()).filter(Boolean);
  let street = p.shift() ?? "";
  if (/^[\d-]+$/.test(street) && p.length) street = `${street} ${p.shift()}`;
  const province = p.pop() ?? "";
  let city = province;
  if (/-do$/i.test(province) && p.length && /-(si|gun)$/i.test(p[p.length - 1])) city = p.pop()!;
  return { street: [street, ...p].join(", "), city, province };
}

/** 국문 주소 → 해외 배송용 영문 주소 */
export const englishAddress = define({
  name: "kr_address_english",
  access: "read",
  description:
    "Convert a Korean address (Hangul, with or without unit like 101동 1203호) into the official English address, split into shipping-form fields: street, unit, city, province, postal code, country. " +
    "For international shipping to Korea, overseas sellers, forwarders and visa or bank forms. 한글 주소를 해외 배송용 영문 주소로 바꿉니다.",
  schema: {
    address: z.string().min(4).max(200).describe("Korean address, e.g. 서울 강남구 테헤란로 152 101동 1203호"),
  },
  handler: async (c, { address }) => {
    const key = c.requireKey("juso", "JUSO_KEY", "https://business.juso.go.kr (도로명주소 API 신청, 무료)");
    const { base, detail } = splitKoreanAddress(address);
    const url = new URL("https://business.juso.go.kr/addrlink/addrLinkApi.do");
    url.searchParams.set("confmKey", key);
    url.searchParams.set("keyword", base);
    url.searchParams.set("currentPage", "1");
    url.searchParams.set("countPerPage", "5");
    url.searchParams.set("resultType", "json");
    const j = await c.getJson<{ results: { common: { errorCode: string; errorMessage: string; totalCount: string }; juso?: Array<Record<string, string>> } }>(url);
    if (j.results.common.errorCode !== "0") throw new Error(`juso.go.kr error ${j.results.common.errorCode}: ${j.results.common.errorMessage}`);
    const list = j.results.juso ?? [];
    if (!list.length) return { found: false, searched: base, hint: "No match. Check the road name and building number (e.g. 테헤란로 152), or try the lot address (역삼동 737)." };
    const a = list[0];
    const f = shippingFields(a.engAddr);
    const d = englishDetail(detail);
    const line2 = [d.unit, d.name].filter(Boolean).join(", ") || null;
    const country = "Republic of Korea";
    return {
      found: true,
      ambiguous: list.length > 1 && Number(j.results.common.totalCount) > 1,
      english: {
        line1: f.street,
        line2,
        city: f.city,
        stateProvince: f.province,
        postalCode: a.zipNo,
        country,
        countryCode: "KR",
        singleLine: [line2, f.street, f.city, f.province === f.city ? "" : f.province, a.zipNo, country].filter(Boolean).join(", "),
      },
      korean: { roadAddress: a.roadAddr, lotAddress: a.jibunAddr, detail: detail || null, postalCode: a.zipNo, building: a.bdNm || null },
      note: "Street, city, province and postal code are official (juso.go.kr). Unit (-dong = building, -ho = unit) and building name are romanized by rule; the courier needs the postal code and unit most.",
      otherMatches: list.slice(1, 3).map((x) => ({ roadAddress: x.roadAddr, english: x.engAddr, postalCode: x.zipNo })),
    };
  },
});

/** 국토부 아파트 매매 실거래가 */
export const aptTrades = define({
  name: "kr_apt_trades",
  access: "read",
  description:
    "Apartment sale transactions (실거래가) for a district (5-digit 법정동코드) and month from MOLIT. " +
    "아파트 매매 실거래가를 조회합니다. Use for market price questions. Needs lawd_cd (e.g. 28185 = 인천 연수구) and year_month (YYYYMM).",
  schema: {
    lawd_cd: z.string().regex(/^\d{5}$/).describe("5-digit district code (시군구). Find via kr_search_address → adminCode first 5 digits"),
    year_month: z.string().regex(/^\d{6}$/).describe("YYYYMM"),
    apartment: z.string().optional().describe("Filter by apartment name (partial)"),
  },
  handler: async (c, { lawd_cd, year_month, apartment }) => {
    const key = c.requireKey("dataGoKr", "DATA_GO_KR_KEY", "https://www.data.go.kr (국토교통부_아파트 매매 실거래가 상세 자료 활용신청)");
    const url = new URL("https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev");
    url.searchParams.set("serviceKey", key);
    url.searchParams.set("LAWD_CD", lawd_cd);
    url.searchParams.set("DEAL_YMD", year_month);
    url.searchParams.set("numOfRows", "1000");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("_type", "json");
    const j = await c.getJson<{ response: { body: { totalCount: number; items: { item?: Array<Record<string, string | number>> } | "" } } }>(url);
    const items = j.response.body.items;
    let list = !items ? [] : Array.isArray(items.item) ? items.item : items.item ? [items.item] : [];
    if (apartment) list = list.filter((it) => String(it.aptNm ?? "").includes(apartment));
    const trades = list.map((it) => ({
      apartment: it.aptNm, dong: it.umdNm, date: `${it.dealYear}-${String(it.dealMonth).padStart(2, "0")}-${String(it.dealDay).padStart(2, "0")}`,
      price_10k_krw: Number(String(it.dealAmount).replace(/[,\s]/g, "")), area_m2: Number(it.excluUseAr), floor: Number(it.floor), built_year: Number(it.buildYear),
      dealing_type: it.dealingGbn ?? null, cancelled: it.cdealType === "O",
    }));
    return { lawd_cd, year_month, total: j.response.body.totalCount, returned: trades.length, trades };
  },
});

export const tools = [checkBusiness, holidays, searchAddress, englishAddress, aptTrades] as const;
