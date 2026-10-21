/**
 * Coupang Open API HMAC ("CEA") signature.
 *
 *   signed-date = UTC  yyMMdd'T'HHmmss'Z'
 *   message     = signed-date + METHOD + path + query      (query without leading "?", no separators)
 *   signature   = hex(HMAC-SHA256(secretKey, message))
 *   Authorization: CEA algorithm=HmacSHA256, access-key=…, signed-date=…, signature=…
 *
 * Reference: https://developers.coupang.com/ko/getting-started/creating-hmac-signature
 */
import { createHmac } from "node:crypto";

export const BASE_URL = "https://api-gateway.coupang.com";

export function signedDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getUTCFullYear()).slice(2)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

export interface SignInput {
  method: string;
  /** path only, e.g. /v2/providers/seller_api/apis/api/v1/marketplace/seller-products */
  path: string;
  /** query string without "?" — must be byte-identical to what is sent */
  query?: string;
  accessKey: string;
  secretKey: string;
  now?: Date;
}

export function sign({ method, path, query = "", accessKey, secretKey, now }: SignInput): { authorization: string; signedDate: string } {
  const date = signedDate(now);
  const message = date + method.toUpperCase() + path + query;
  const signature = createHmac("sha256", secretKey).update(message).digest("hex");
  return {
    signedDate: date,
    authorization: `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${date}, signature=${signature}`,
  };
}
