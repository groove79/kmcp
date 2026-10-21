#!/usr/bin/env node
/**
 * Probe which request body the Naver option-stock endpoint actually honours.
 * Reads credentials from Claude Desktop config (never prints them), tries body variants on ONE product,
 * reads back the stock after each, and restores the original stock at the end.
 *
 * Usage: node scripts/stock-probe.mjs <originProductNo> <channelProductNo>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TokenProvider } from "../dist/auth.js";
import { NaverClient } from "../dist/client.js";

const [originNo, channelNo] = process.argv.slice(2).map(Number);
if (!originNo || !channelNo) {
  console.error("usage: node scripts/stock-probe.mjs <originProductNo> <channelProductNo>");
  process.exit(1);
}

const cfgPath = path.join(os.homedir(), "Library/Application Support/Claude/claude_desktop_config.json");
const env = JSON.parse(fs.readFileSync(cfgPath, "utf8")).mcpServers["naver-commerce"].env;
const client = new NaverClient(new TokenProvider({ clientId: env.NAVER_COMMERCE_CLIENT_ID, clientSecret: env.NAVER_COMMERCE_CLIENT_SECRET }));

const readStock = async () => (await client.get(`/v2/products/channel-products/${channelNo}`)).originProduct.stockQuantity;
const put = (body) => client.put(`/v1/products/origin-products/${originNo}/option-stock`, body);

const original = await readStock();
const target = original + 1;
console.log(`원래 재고: ${original} → 목표 ${target}`);

const variants = {
  "A: stockQuantity + optionInfo:{}": { stockQuantity: target, optionInfo: {} },
  "B: stockQuantity + optionInfo:{useStockManagement:true}": { stockQuantity: target, optionInfo: { useStockManagement: true } },
  "C: stockQuantity + 빈 배열들(현재 코드)": {
    stockQuantity: target,
    optionInfo: { optionSimple: [], optionCustom: [], optionCombinations: [], useStockManagement: true },
  },
  "D: optionInfo 안에 stockQuantity": { optionInfo: { stockQuantity: target } },
  "E: optionInfo:{} 만": { optionInfo: {}, stockQuantity: target, useStockManagement: true },
};

// F: full channel-product round-trip (maintainer: no stock-only API for single products)
const roundTrip = async (n) => {
  const d = await client.get(`/v2/products/channel-products/${channelNo}`);
  d.originProduct.stockQuantity = n;
  return client.put(`/v2/products/channel-products/${channelNo}`, {
    originProduct: d.originProduct,
    smartstoreChannelProduct: d.smartstoreChannelProduct,
  });
};
variants["F: 채널상품 전체 PUT (상세 조회 → stockQuantity 변경 → PUT)"] = "ROUNDTRIP";

let winner = null;
for (const [name, body] of Object.entries(variants)) {
  try {
    const res = body === "ROUNDTRIP" ? await roundTrip(target) : await put(body);
    await new Promise((r) => setTimeout(r, 1500));
    const after = await readStock();
    console.log(`${name} → HTTP OK, 재고 ${after}  ${after === target ? "✅ 적용됨" : "✗ 미적용"}  resp=${JSON.stringify(res)}`);
    if (after === target) { winner = name; break; }
  } catch (e) {
    console.log(`${name} → ${e.message.split("\n")[0].slice(0, 200)}`);
  }
}

// restore
try {
  if (winner && variants[winner] === "ROUNDTRIP") {
    await roundTrip(original);
  } else {
    const restoreBody = winner ? { ...variants[winner] } : variants["C: stockQuantity + 빈 배열들(현재 코드)"];
    const setTo = (b, n) => JSON.parse(JSON.stringify(b).replaceAll(String(target), String(n)));
    await put(setTo(restoreBody, original));
  }
  await new Promise((r) => setTimeout(r, 1500));
  console.log(`복구 후 재고: ${await readStock()} (원래 ${original})`);
} catch (e) {
  console.log("복구 실패:", e.message.slice(0, 200));
}
console.log(winner ? `\n결론: "${winner}" 형식이 동작합니다.` : "\n결론: 어떤 형식도 재고를 바꾸지 못했습니다 — 출력 전체를 붙여주세요.");
