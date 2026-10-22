/**
 * Secret + PII masking for cassettes. Cassettes are committed to a public repo, so masking is a hard gate:
 * anything that looks like a credential or a person is replaced before it is written.
 */
const SECRET_KEY_RE = /(authorization|token|secret|api[-_]?key|accesskey|access_key|client_secret|password|passwd|signature|sign|serviceKey|confmKey|appid|applicationid|x-cafe24-|x-naver-|cookie|set-cookie)/i;
const PII_KEY_RE = /(buyer|receiver|orderer|customer|member|user)?[-_]?(name|tel|phone|mobile|cellphone|email|address|zipcode|addr|ordererTel|receiverTel|receiverName|ordererName|holderName|accountNumber|cardNumber|birth)$/i;
const VALUE_RES: RegExp[] = [
  /\b01[016789]-?\d{3,4}-?\d{4}\b/g,                     // KR mobile
  /\b\d{3}-\d{2}-\d{5}\b/g,                                // 사업자번호
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,       // email
  /\bBearer\s+[A-Za-z0-9._-]+/g,
  /\b(test|live)_[sc]k_[A-Za-z0-9]+/g,                     // toss keys
  /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{22,53}/g,                   // bcrypt (naver secret)
];
/** keys whose VALUE is an id we deliberately keep (needed for replay matching) */
const KEEP = new Set(["product_no", "productNo", "originProductNo", "channelProductNo", "variant_code", "shop_no", "board_no", "mall_id", "paymentKey", "orderId"]);

export function maskValue(v: string): string {
  let s = v;
  for (const re of VALUE_RES) s = s.replace(re, (m) => (m.startsWith("Bearer") ? "Bearer ***" : "***"));
  return s;
}

export function maskDeep(input: unknown, path: string[] = []): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return maskValue(input);
  if (Array.isArray(input)) return input.map((x, i) => maskDeep(x, [...path, String(i)]));
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (KEEP.has(k)) { out[k] = v; continue; }
      if (SECRET_KEY_RE.test(k) || PII_KEY_RE.test(k)) { out[k] = typeof v === "string" || typeof v === "number" ? "***" : maskDeep(v, [...path, k]); continue; }
      out[k] = maskDeep(v, [...path, k]);
    }
    return out;
  }
  return input;
}

/** Query params that change every call or carry credentials — dropped from the cassette key and value. */
export const VOLATILE_QUERY = new Set(["timestamp", "signed-date", "client_secret_sign", "access_token", "code", "state", "serviceKey", "ServiceKey", "confmKey", "applicationId", "accessKey", "appid", "nonce", "_"]);

export function maskUrl(url: string): string {
  const u = new URL(url);
  for (const k of [...u.searchParams.keys()]) if (VOLATILE_QUERY.has(k) || SECRET_KEY_RE.test(k)) u.searchParams.set(k, "***");
  return u.href;
}

export const MASKED_HEADERS = ["content-type", "x-cafe24-api-version", "x-ratelimit-remaining", "retry-after", "date"];
