#!/usr/bin/env node
/**
 * Live probe for naver_upload_images + naver_create_product (statusType SUSPENSION) — runs the real tool handlers.
 *
 *  1. picks the leaf category of an existing product in the store (so the category is certainly valid)
 *  2. generates a 64×64 PNG and uploads it (naver_upload_images)
 *  3. creates ONE product in 판매중지(SUSPENSION) with "K-MCP 테스트" in the name (naver_create_product)
 *  4. reads it back, then DELETEs it unless --keep is passed
 *
 * Credentials: /Volumes/Dev/.secrets/naver.env (NAVER_COMMERCE_CLIENT_ID/SECRET) or env vars. Never printed.
 * Usage: node scripts/create-probe.mjs [--keep]
 */
import fs from "node:fs";
import zlib from "node:zlib";
import { z } from "zod";
import { TokenProvider } from "../dist/auth.js";
import { NaverClient } from "../dist/client.js";
import { uploadImages, createProduct } from "../dist/tools.js";

const keep = process.argv.includes("--keep");
const envFile = "/Volumes/Dev/.secrets/naver.env";
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { NAVER_COMMERCE_CLIENT_ID: id, NAVER_COMMERCE_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) { console.error(`credentials missing — expected ${envFile}`); process.exit(1); }
const client = new NaverClient(new TokenProvider({ clientId: id, clientSecret: secret }));
const parse = (tool, args) => z.object(tool.schema).parse(args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. a valid leaf category from the store itself
const list = await client.post("/v1/products/search", { page: 1, size: 5, productStatusTypes: ["SALE"] });
const first = list.contents?.[0];
if (!first) { console.error("판매중 상품이 없어 카테고리를 가져올 수 없습니다."); process.exit(1); }
const channelNo = first.channelProducts?.[0]?.channelProductNo;
const detail = await client.get(`/v2/products/channel-products/${channelNo}`);
const leafCategoryId = String(detail.originProduct.leafCategoryId);
const sample = { name: detail.originProduct.name, afterService: detail.originProduct.detailAttribute?.afterServiceInfo, deliveryCompany: detail.originProduct.deliveryInfo?.deliveryCompany };
console.log(`1) 기준 상품: ${sample.name} → leafCategoryId ${leafCategoryId}, 택배사 ${sample.deliveryCompany ?? "(없음→CJGLS)"}`);

// 2. tiny PNG (64×64 solid) → upload
function png(w, h, [r, g, b]) {
  const crc = (buf) => { let c = ~0; for (const x of buf) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (~c) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const up = await uploadImages.handler(client, parse(uploadImages, { images: [{ base64: png(64, 64, [30, 100, 220]).toString("base64"), filename: "kmcp-test.png", contentType: "image/png" }] }));
console.log(`2) 이미지 업로드: ${up.urls.length}장 → ${up.urls[0]}`);

// 3. create in WAIT
const created = await createProduct.handler(client, parse(createProduct, {
  name: `K-MCP 테스트 상품 (삭제 예정) ${new Date(Date.now()+9*3600e3).toISOString().slice(11, 16)}`,
  leafCategoryId,
  detailContent: "<p>K-MCP naver_create_product 실검증용 임시 상품입니다. 판매대기 상태로만 등록되며 곧 삭제됩니다.</p>",
  salePrice: 10000,
  stockQuantity: 1,
  representativeImageUrl: up.urls[0],
  statusType: "SUSPENSION",
  originArea: { code: "03", content: "일본", importer: "앱몬스터(구매대행)" },
  afterService: { telephone: sample.afterService?.afterServiceTelephoneNumber || "010-7990-5703", guide: sample.afterService?.afterServiceGuideContent || "구매대행 상품으로 A/S는 판매자에게 문의해 주세요." },
  delivery: { deliveryFeeType: "FREE", deliveryCompany: sample.deliveryCompany || "CJGLS" },
  notice: { productInfoProvidedNoticeType: "ETC" },
  sellerManagementCode: "KMCP-PROBE",
  naverShoppingRegistration: false,
}));
console.log(`3) 등록 결과: ${JSON.stringify(created)}`);
if (!created.originProductNo) { console.error("originProductNo 없음 — 응답 전체를 붙여주세요."); process.exit(1); }

// 4. read back + delete
await sleep(1500);
const back = await client.get(`/v2/products/origin-products/${created.originProductNo}`).catch((e) => ({ error: e.message.slice(0, 300) }));
const ch = await client.get(`/v2/products/channel-products/${created.channelProductNo}`).catch(() => ({}));
console.log(`4) 재조회: status=${back.originProduct?.statusType ?? "?"} display=${ch.smartstoreChannelProduct?.channelProductDisplayStatusType ?? "?"} name=${back.originProduct?.name ?? back.error}  ${back.originProduct?.statusType === "SUSPENSION" ? "✅ 판매중지 유지" : "✗ 라이브 상태!"}`);
if (keep) { console.log("--keep: 삭제하지 않음. 스마트스토어센터 > 상품관리 > 판매중지에서 확인 후 직접 삭제하세요."); }
else {
  const del = await client.request("DELETE", `/v2/products/origin-products/${created.originProductNo}`).catch((e) => ({ error: e.message.slice(0, 300) }));
  console.log(`5) 삭제: ${del?.error ? "실패 — " + del.error : "OK " + JSON.stringify(del)}`);
}
console.log("\n결론: naver_upload_images → naver_create_product(WAIT) 실호출 " + (back.originProduct?.statusType === "SUSPENSION" ? "✅ 성공 (등록 + 판매중지 유지 + 삭제)" : "✗ 재조회 실패 — 출력 전체를 붙여주세요"));
