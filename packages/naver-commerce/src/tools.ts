/**
 * The five MVP tools. Each tool: name = verb_object, description = EN first sentence + KO second,
 * "when to use" + "what it needs" in one line each, so an agent can pick it from the description alone.
 *
 * Access level: read | write. Write tools are the ones the approval hook (product 4) will gate.
 */
import { z } from "zod";
import type { NaverClient } from "./client.js";

export type Access = "read" | "write";

export interface ToolDef<S extends z.ZodRawShape> {
  name: string;
  description: string;
  access: Access;
  schema: S;
  handler: (client: NaverClient, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}

const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

/** KST ISO string with offset, e.g. 2026-10-21T00:00:00.000+09:00 — what Naver's date params expect. */
export function toKstIso(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  return kst.toISOString().replace("Z", "+09:00");
}

export const listProducts = define({
  name: "naver_list_products",
  access: "read",
  description:
    "List products in the seller's Naver Smart Store with paging and optional filters (status, name, product numbers). " +
    "스마트스토어 상품 목록을 조회합니다. Use first to find channelProductNo/originProductNo before updating stock. Needs nothing but optional filters.",
  schema: {
    page: z.number().int().min(1).default(1).describe("Page number, 1-based"),
    size: z.number().int().min(1).max(500).default(50).describe("Items per page (max 500)"),
    productStatusTypes: z
      .array(z.enum(["WAIT", "SALE", "OUTOFSTOCK", "UNADMISSION", "REJECTION", "SUSPENSION", "CLOSE", "PROHIBITION", "DELETE"]))
      .optional()
      .describe("Filter by status. SALE = on sale, OUTOFSTOCK = sold out"),
    productName: z.string().optional().describe("Partial product name match"),
    channelProductNos: z.array(z.number().int()).optional().describe("Specific channel product numbers"),
    originProductNos: z.array(z.number().int()).optional().describe("Specific origin product numbers"),
  },
  handler: (client, args) => client.post("/v1/products/search", args),
});

export const getProduct = define({
  name: "naver_get_product",
  access: "read",
  description:
    "Get full detail of one channel product (name, price, options, stock, status) by channelProductNo — the number in the smartstore URL. " +
    "채널상품 상세를 조회합니다. Use to read option/stock before changing them. Needs channelProductNo.",
  schema: {
    channelProductNo: z.number().int().describe("Channel product number (smartstore.naver.com/.../products/<this>)"),
  },
  handler: (client, { channelProductNo }) => client.get(`/v2/products/channel-products/${channelProductNo}`),
});

export const updateStock = define({
  name: "naver_update_stock",
  access: "write",
  description:
    "Change stock quantity of a product or its options. For a product WITHOUT options pass channelProductNo + stockQuantity; for a product WITH options pass originProductNo + options[]. " +
    "상품/옵션 재고를 변경합니다. IRREVERSIBLE: changes the live store. Needs channelProductNo (no-option) or originProductNo (option product); both come from naver_list_products.",
  schema: {
    channelProductNo: z.number().int().optional().describe("Channel product number — required for a product without options"),
    originProductNo: z.number().int().optional().describe("Origin product number — required for a product with options"),
    stockQuantity: z.number().int().min(0).optional().describe("New stock for a product without options"),
    options: z
      .array(
        z.object({
          id: z.number().int().describe("Option id (optionCombinations[].id)"),
          stockQuantity: z.number().int().min(0),
        }),
      )
      .optional()
      .describe("Per-option stock for products with options"),
  },
  handler: async (client, { channelProductNo, originProductNo, stockQuantity, options }) => {
    if (options?.length) {
      // Option products: the option-stock endpoint updates per-combination stock.
      if (originProductNo === undefined) throw new Error("options[] requires originProductNo.");
      return client.put(`/v1/products/origin-products/${originProductNo}/option-stock`, {
        optionInfo: {
          optionCombinationSortType: "CREATE",
          optionCombinations: options.map((o) => ({ id: o.id, stockQuantity: o.stockQuantity })),
          useStockManagement: true,
        },
      });
    }
    if (stockQuantity === undefined) throw new Error("Provide stockQuantity (no-option product) or options[] (option product).");
    if (channelProductNo === undefined) throw new Error("stockQuantity requires channelProductNo.");
    // No-option products: Naver has no stock-only API (option-stock silently ignores stockQuantity).
    // Verified 2026-10-21: GET the channel product, change originProduct.stockQuantity, PUT it back whole.
    const detail = await client.get<{ originProduct: { stockQuantity?: number }; smartstoreChannelProduct: unknown }>(
      `/v2/products/channel-products/${channelProductNo}`,
    );
    const before = detail.originProduct.stockQuantity;
    detail.originProduct.stockQuantity = stockQuantity;
    await client.put(`/v2/products/channel-products/${channelProductNo}`, {
      originProduct: detail.originProduct,
      smartstoreChannelProduct: detail.smartstoreChannelProduct,
    });
    return { channelProductNo, stockQuantity: { before, after: stockQuantity } };
  },
});

export const listOrders = define({
  name: "naver_list_orders",
  access: "read",
  description:
    "List product orders whose status changed since a time (default: last 24h) — new payments, cancellations, returns — then optionally fetch details. " +
    "변경된 상품주문 내역을 조회합니다. Use for 'any new orders?' questions. Needs nothing; lastChangedFrom optional (ISO 8601).",
  schema: {
    lastChangedFrom: z.string().optional().describe("ISO 8601 datetime; default = 24 hours ago. Max range 24h per call."),
    lastChangedTo: z.string().optional().describe("ISO 8601 datetime; default = now"),
    lastChangedType: z
      .enum(["PAY_WAITING", "PAYED", "EXCHANGE_OPTION", "DELIVERY_ADDRESS_CHANGED", "GIFT_RECEIVED", "CLAIM_REJECTED", "DISPATCHED", "CLAIM_REQUESTED", "COLLECT_DONE", "CLAIM_HOLDBACK_RELEASED", "CLAIM_COMPLETED", "PURCHASE_DECIDED", "HOPE_DELIVERY_INFO_CHANGED", "CLAIM_REDELIVERING"])
      .optional()
      .describe("Filter by change type, e.g. PAYED for newly paid orders"),
    withDetails: z.boolean().default(true).describe("Also fetch order details (buyer, product, amounts) for the returned productOrderIds"),
  },
  handler: async (client, { lastChangedFrom, lastChangedTo, lastChangedType, withDetails }) => {
    const from = lastChangedFrom ?? toKstIso(new Date(Date.now() - 24 * 3600 * 1000));
    const changed = await client.get<{ data?: { lastChangeStatuses?: Array<{ productOrderId: string }> } }>(
      "/v1/pay-order/seller/product-orders/last-changed-statuses",
      { lastChangedFrom: from, lastChangedTo, lastChangedType },
    );
    const ids = changed.data?.lastChangeStatuses?.map((s) => s.productOrderId) ?? [];
    if (!withDetails || ids.length === 0) return changed;
    const details = await client.post("/v1/pay-order/seller/product-orders/query", { productOrderIds: ids.slice(0, 300) });
    return { changed: changed.data, details };
  },
});

export const listInquiries = define({
  name: "naver_list_inquiries",
  access: "read",
  description:
    "List customer 1:1 inquiries (고객문의) in a date range, optionally only unanswered ones. " +
    "고객 문의 목록을 조회합니다. Use for 'any customer questions to answer?'. Needs nothing; defaults to last 7 days.",
  schema: {
    startSearchDate: z.string().optional().describe("YYYY-MM-DD, default 7 days ago"),
    endSearchDate: z.string().optional().describe("YYYY-MM-DD, default today"),
    answered: z.boolean().optional().describe("true = answered only, false = unanswered only, omit = all"),
    page: z.number().int().min(1).default(1),
    size: z.number().int().min(1).max(100).default(50),
  },
  handler: (client, { startSearchDate, endSearchDate, answered, page, size }) => {
    const day = (d: Date) => toKstIso(d).slice(0, 10);
    return client.get("/v1/pay-user/inquiries", {
      startSearchDate: startSearchDate ?? day(new Date(Date.now() - 7 * 86400 * 1000)),
      endSearchDate: endSearchDate ?? day(new Date()),
      answered: answered === undefined ? undefined : String(answered),
      page,
      size,
    });
  },
});

export const tools = [listProducts, getProduct, updateStock, listOrders, listInquiries] as const;
