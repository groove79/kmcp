/**
 * Carrier aliases → Delivery Tracker carrier ids, so an agent can pass "CJ대한통운" / "우체국" / "ヤマト" without a lookup.
 * Unknown names fall back to the live `carriers(searchText)` query.
 */
export const CARRIER_ALIASES: Record<string, string[]> = {
  "kr.cjlogistics": ["cj대한통운", "cj 대한통운", "대한통운", "cj logistics", "cjlogistics", "cj"],
  "kr.epost": ["우체국", "우체국택배", "epost", "korea post", "우정사업본부"],
  "kr.hanjin": ["한진", "한진택배", "hanjin"],
  "kr.lotte": ["롯데", "롯데택배", "롯데글로벌로지스", "lotte"],
  "kr.logen": ["로젠", "로젠택배", "logen"],
  "kr.kdexp": ["경동", "경동택배", "kdexp"],
  "kr.daesin": ["대신", "대신택배", "daesin"],
  "kr.cupost": ["cu", "cu편의점택배", "cupost"],
  "kr.cvsnet": ["gs25", "gs편의점택배", "gspostbox", "cvsnet"],
  "kr.chunilps": ["천일", "천일택배", "chunil"],
  "kr.hdexp": ["합동", "합동택배", "hdexp"],
  "kr.ilyanglogis": ["일양", "일양로지스", "ilyang"],
  "kr.coupangls": ["쿠팡", "쿠팡로지스틱스", "coupang", "cls"],
  "kr.kunyoung": ["건영", "건영택배"],
  "kr.slx": ["slx", "slx택배"],
  "jp.yamato": ["야마토", "ヤマト", "yamato", "kuroneko", "クロネコ"],
  "jp.sagawa": ["사가와", "佐川", "sagawa"],
  "jp.japanpost": ["일본우체국", "japan post", "日本郵便", "ゆうパック", "yu-pack"],
  "de.dhl": ["dhl"],
  "us.ups": ["ups"],
  "us.fedex": ["fedex", "페덱스"],
  "us.usps": ["usps"],
  "cn.ems": ["ems", "china ems"],
  "global.ems": ["국제우편", "international ems"],
};

const norm = (s: string) => s.toLowerCase().replace(/[\s()\-_.]/g, "");

/** Resolve a user-facing carrier name to an id; returns null when unknown (caller may query the API). */
export function resolveCarrier(input: string): string | null {
  const n = norm(input);
  if (/^[a-z]{2}\.[a-z0-9]+$/i.test(input.trim())) return input.trim().toLowerCase();
  for (const [id, aliases] of Object.entries(CARRIER_ALIASES)) {
    if (aliases.some((a) => norm(a) === n) || norm(id.split(".")[1]) === n) return id;
  }
  for (const [id, aliases] of Object.entries(CARRIER_ALIASES)) {
    if (aliases.some((a) => n.includes(norm(a)) && norm(a).length >= 2)) return id;
  }
  return null;
}

/** Status code → Korean label + whether the parcel is still moving. */
export const STATUS_KO: Record<string, { ko: string; final: boolean }> = {
  UNKNOWN: { ko: "알 수 없음", final: false },
  INFORMATION_RECEIVED: { ko: "접수(송장 등록)", final: false },
  AT_PICKUP: { ko: "집화", final: false },
  IN_TRANSIT: { ko: "이동 중", final: false },
  OUT_FOR_DELIVERY: { ko: "배송 출발", final: false },
  ATTEMPT_FAIL: { ko: "배송 실패(재시도 예정)", final: false },
  DELIVERED: { ko: "배송 완료", final: true },
  AVAILABLE_FOR_PICKUP: { ko: "수령 대기(편의점/보관함)", final: false },
  EXCEPTION: { ko: "배송 이상(확인 필요)", final: false },
};
