import { z } from "zod";
import zlib from "node:zlib";
import { NaverClient, TokenProvider, tools } from "@appmonster/mcp-naver-commerce";
import type { Check, Ctx } from "../types.js";
import { callTool, byName, sleep } from "./_util.js";

const NEEDS = ["NAVER_COMMERCE_CLIENT_ID", "NAVER_COMMERCE_CLIENT_SECRET"];
const client = (ctx: Ctx) => new NaverClient(new TokenProvider({ clientId: ctx.env.NAVER_COMMERCE_CLIENT_ID!, clientSecret: ctx.env.NAVER_COMMERCE_CLIENT_SECRET!, fetchImpl: ctx.fetchImpl }), { fetchImpl: ctx.fetchImpl });

/** 64×64 solid PNG — the canary's own decoy image, generated so no asset file is needed. */
function png(w: number, h: number, [r, g, b]: [number, number, number]) {
  const crc = (buf: Buffer) => { let c = ~0; for (const x of buf) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (~c) >>> 0; };
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))), chunk("IEND", Buffer.alloc(0))]);
}

export const DECOY_PREFIX = "[K-MCP 카나리] 미끼 상품";

export const checks: Check[] = [
  {
    id: "naver-commerce.listProducts", platform: "naver-commerce", access: "read", needs: NEEDS,
    expect: z.object({ contents: z.array(z.object({ originProductNo: z.number(), channelProducts: z.array(z.object({ channelProductNo: z.number(), name: z.string(), statusType: z.string() })) })), totalElements: z.number().optional() }),
    run: (ctx) => callTool(byName(tools, "naver_list_products"), client(ctx), { size: 5, productStatusTypes: ["SALE"] }),
  },
  {
    id: "naver-commerce.getProduct", platform: "naver-commerce", access: "read", needs: NEEDS,
    expect: z.object({ originProduct: z.object({ name: z.string(), statusType: z.string(), stockQuantity: z.number(), leafCategoryId: z.string() }), smartstoreChannelProduct: z.object({ channelProductDisplayStatusType: z.string() }).partial() }),
    run: async (ctx) => {
      const c = client(ctx);
      const list = await callTool(byName(tools, "naver_list_products"), c, { size: 1, productStatusTypes: ["SALE"] }) as { contents: Array<{ channelProducts: Array<{ channelProductNo: number }> }> };
      return callTool(byName(tools, "naver_get_product"), c, { channelProductNo: list.contents[0].channelProducts[0].channelProductNo });
    },
  },
  {
    id: "naver-commerce.listOrders", platform: "naver-commerce", access: "read", needs: NEEDS,
    expect: z.union([z.object({ data: z.unknown() }), z.object({ changed: z.unknown(), details: z.unknown() })]),
    run: (ctx) => callTool(byName(tools, "naver_list_orders"), client(ctx), { withDetails: true }),
  },
  {
    id: "naver-commerce.listInquiries", platform: "naver-commerce", access: "read", needs: NEEDS,
    expect: z.object({ contents: z.array(z.unknown()).optional(), totalElements: z.number().optional() }).passthrough(),
    run: (ctx) => callTool(byName(tools, "naver_list_inquiries"), client(ctx), { size: 10 }),
  },
  {
    // Decoy only: uploads its own image, creates ONE product in 판매중지 with a canary name, verifies it is not live, deletes it.
    // Never touches products that are or were on sale.
    id: "naver-commerce.createDecoyProduct", platform: "naver-commerce", access: "write-sandbox", needs: NEEDS,
    expect: z.object({ originProductNo: z.number(), channelProductNo: z.number(), status: z.literal("SUSPENSION"), displayStatus: z.literal("SUSPENSION"), notes: z.array(z.string()).length(0) }),
    timeoutMs: 60_000,
    run: async (ctx) => {
      const c = client(ctx);
      const sample = await callTool(byName(tools, "naver_list_products"), c, { size: 1, productStatusTypes: ["SALE"] }) as { contents: Array<{ channelProducts: Array<{ channelProductNo: number }> }> };
      const detail = await callTool(byName(tools, "naver_get_product"), c, { channelProductNo: sample.contents[0].channelProducts[0].channelProductNo }) as { originProduct: { leafCategoryId: string; deliveryInfo?: { deliveryCompany?: string }; detailAttribute?: { afterServiceInfo?: { afterServiceTelephoneNumber?: string; afterServiceGuideContent?: string } } } };
      const up = await callTool(byName(tools, "naver_upload_images"), c, { images: [{ base64: png(64, 64, [30, 100, 220]).toString("base64"), filename: "kmcp-canary.png", contentType: "image/png" }] }) as { urls: string[] };
      return callTool(byName(tools, "naver_create_product"), c, {
        name: `${DECOY_PREFIX} ${ctx.today} (자동 삭제)`,
        leafCategoryId: String(detail.originProduct.leafCategoryId),
        detailContent: "<p>K-MCP 카나리 자동 검증용 미끼 상품입니다. 판매중지 상태로만 존재하며 즉시 삭제됩니다.</p>",
        salePrice: 10000, stockQuantity: 1, representativeImageUrl: up.urls[0], statusType: "SUSPENSION",
        originArea: { code: "03", content: "일본", importer: "앱몬스터(구매대행)" },
        afterService: { telephone: detail.originProduct.detailAttribute?.afterServiceInfo?.afterServiceTelephoneNumber || "010-0000-0000", guide: detail.originProduct.detailAttribute?.afterServiceInfo?.afterServiceGuideContent || "판매자 문의" },
        delivery: { deliveryFeeType: "FREE", deliveryCompany: detail.originProduct.deliveryInfo?.deliveryCompany || "CJGLS" },
        notice: { productInfoProvidedNoticeType: "ETC" }, sellerManagementCode: "KMCP-CANARY", naverShoppingRegistration: false,
      });
    },
    revert: async (ctx, out) => {
      const { originProductNo } = out as { originProductNo: number };
      await sleep(1500);
      await client(ctx).request("DELETE", `/v2/products/origin-products/${originProductNo}`);
    },
  },
];
