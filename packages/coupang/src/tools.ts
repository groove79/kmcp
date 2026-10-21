/**
 * Coupang Wing tools. Naming: coupang_<verb>_<object>. Description: EN first, KO second, then "Use when…" / "Needs…".
 * Access: read | write — write tools go through approveWrite when provided.
 */
import { z } from "zod";
import type { CoupangClient } from "./client.js";

export type Access = "read" | "write";
export interface ToolDef<S extends z.ZodRawShape> {
  name: string;
  description: string;
  access: Access;
  schema: S;
  handler: (client: CoupangClient, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

const SELLER = "/v2/providers/seller_api/apis/api/v1/marketplace";
const openapi = (vendorId: string, v: "v4" | "v5") => `/v2/providers/openapi/apis/api/${v}/vendors/${vendorId}`;

interface Envelope<T> { code: string | number; message?: string; data: T; nextToken?: string }

/** Coupang money objects {currencyCode, units, nanos} → number */
export function money(m: unknown): number | null {
  if (m == null) return null;
  if (typeof m === "number") return m;
  const o = m as { units?: number | string; nanos?: number };
  const units = Number(o.units ?? 0);
  const nanos = Number(o.nanos ?? 0);
  return units + nanos / 1e9;
}

/** yyyy-MM-dd (KST). Coupang wants createdAtFrom/To as "yyyy-MM-dd+09:00" — the "+" is percent-encoded by the client. */
export function kstDate(d: Date): string {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export const ORDER_STATUS = ["ACCEPT", "INSTRUCT", "DEPARTURE", "DELIVERING", "FINAL_DELIVERY", "NONE_TRACKING"] as const;

export const listProducts = define({
  name: "coupang_list_products",
  access: "read",
  description:
    "List the seller's registered products on Coupang (paged). " +
    "쿠팡 윙에 등록된 상품 목록을 조회합니다. Use first to find sellerProductId before reading details or changing stock/price. " +
    "Needs nothing; optional name/status filter and nextToken for the next page.",
  schema: {
    sellerProductName: z.string().max(20).optional().describe("Name search, ≤20 chars"),
    status: z.enum(["IN_REVIEW", "SAVED", "APPROVING", "APPROVED", "PARTIAL_APPROVED", "DENIED", "DELETED"]).optional(),
    createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Registered on this day, yyyy-MM-dd"),
    maxPerPage: z.number().int().min(1).max(100).default(50),
    nextToken: z.string().optional().describe("From the previous response; omit for the first page"),
  },
  handler: async (c, a) => {
    const res = await c.get<Envelope<Array<Record<string, unknown>>>>(`${SELLER}/seller-products`, {
      vendorId: c.vendorId,
      sellerProductName: a.sellerProductName,
      status: a.status,
      createdAt: a.createdAt,
      maxPerPage: a.maxPerPage,
      nextToken: a.nextToken,
    });
    return {
      products: (res.data ?? []).map((p) => ({
        sellerProductId: p.sellerProductId,
        name: p.sellerProductName,
        status: p.statusName,
        brand: p.brand,
        categoryCode: p.displayCategoryCode,
        saleStartedAt: p.saleStartedAt,
        createdAt: p.createdAt,
      })),
      nextToken: res.nextToken || null,
    };
  },
});

export const getProduct = define({
  name: "coupang_get_product",
  access: "read",
  description:
    "Get one Coupang product with all its items (options): vendorItemId, name, prices, max buy count, shipping lead time. " +
    "상품 상세와 옵션(아이템) 목록을 조회합니다. Use to find the vendorItemId that stock/price changes need. Needs sellerProductId.",
  schema: { sellerProductId: z.number().int().positive() },
  handler: async (c, { sellerProductId }) => {
    const res = await c.get<Envelope<Record<string, unknown>>>(`${SELLER}/seller-products/${sellerProductId}`);
    const d = res.data ?? {};
    const items = ((d.items as Array<Record<string, unknown>>) ?? []).map((it) => ({
      vendorItemId: it.vendorItemId,
      sellerProductItemId: it.sellerProductItemId,
      itemName: it.itemName,
      originalPrice: it.originalPrice,
      salePrice: it.salePrice,
      maximumBuyCount: it.maximumBuyCount,
      outboundShippingTimeDay: it.outboundShippingTimeDay,
      externalVendorSku: it.externalVendorSku,
      barcode: it.barcode,
    }));
    return {
      sellerProductId: d.sellerProductId,
      name: d.sellerProductName,
      displayName: d.displayProductName,
      status: d.statusName,
      brand: d.brand,
      categoryCode: d.displayCategoryCode,
      deliveryMethod: d.deliveryMethod,
      deliveryChargeType: d.deliveryChargeType,
      deliveryCharge: d.deliveryCharge,
      saleStartedAt: d.saleStartedAt,
      saleEndedAt: d.saleEndedAt,
      items,
    };
  },
});

export const updateQuantity = define({
  name: "coupang_update_item_quantity",
  access: "write",
  description:
    "Set the sellable quantity of one Coupang item (option). 0 marks it sold out. " +
    "옵션(아이템) 재고 수량을 변경합니다. Use after confirming vendorItemId with coupang_get_product. Needs vendorItemId and the new quantity (absolute, not delta).",
  schema: {
    vendorItemId: z.number().int().positive(),
    quantity: z.number().int().min(0).max(99999).describe("New absolute quantity"),
  },
  handler: async (c, { vendorItemId, quantity }) => {
    const res = await c.put<Envelope<unknown>>(`${SELLER}/vendor-items/${vendorItemId}/quantities/${quantity}`);
    return { vendorItemId, quantity, result: res.code, message: res.message ?? null };
  },
});

export const updatePrice = define({
  name: "coupang_update_item_price",
  access: "write",
  description:
    "Change the sale price of one Coupang item (option), in KRW. " +
    "옵션(아이템) 판매가를 변경합니다. Coupang rejects changes beyond its allowed ratio from the current price unless forceSalePriceUpdate is true. Needs vendorItemId and the new price.",
  schema: {
    vendorItemId: z.number().int().positive(),
    price: z.number().int().min(10).describe("New sale price in KRW (multiple of 10)"),
    forceSalePriceUpdate: z.boolean().default(false).describe("Allow a change larger than Coupang's default guard ratio"),
  },
  handler: async (c, { vendorItemId, price, forceSalePriceUpdate }) => {
    const res = await c.request<Envelope<unknown>>("PUT", `${SELLER}/vendor-items/${vendorItemId}/prices/${price}`, {
      query: forceSalePriceUpdate ? { forceSalePriceUpdate: true } : undefined,
    });
    return { vendorItemId, price, result: res.code, message: res.message ?? null };
  },
});

function orderView(o: Record<string, unknown>) {
  const orderer = (o.orderer ?? {}) as Record<string, unknown>;
  const receiver = (o.receiver ?? {}) as Record<string, unknown>;
  const items = ((o.orderItems as Array<Record<string, unknown>>) ?? []).map((it) => ({
    vendorItemId: it.vendorItemId,
    name: it.vendorItemName,
    quantity: it.shippingCount,
    cancelCount: it.cancelCount ?? 0,
    holdCountForCancel: it.holdCountForCancel ?? 0,
    salesPrice: money(it.salesPrice),
    orderPrice: money(it.orderPrice),
    externalVendorSkuCode: it.externalVendorSkuCode,
  }));
  return {
    shipmentBoxId: o.shipmentBoxId,
    orderId: o.orderId,
    orderedAt: o.orderedAt,
    paidAt: o.paidAt,
    status: o.status,
    shippingPrice: money(o.shippingPrice),
    orderer: { name: orderer.name, safeNumber: orderer.safeNumber },
    receiver: {
      name: receiver.name,
      safeNumber: receiver.safeNumber,
      address: [receiver.addr1, receiver.addr2].filter(Boolean).join(" "),
      postCode: receiver.postCode,
    },
    deliveryCompanyName: o.deliveryCompanyName,
    invoiceNumber: o.invoiceNumber,
    parcelPrintMessage: o.parcelPrintMessage,
    items,
  };
}

export const listOrders = define({
  name: "coupang_list_orders",
  access: "read",
  description:
    "List Coupang order sheets (발주서) in a date range by status: ACCEPT=paid, INSTRUCT=preparing, DEPARTURE=shipped, DELIVERING, FINAL_DELIVERY, NONE_TRACKING. Max 31 days per call, 50 per page. " +
    "기간·상태별 발주서 목록을 조회합니다. Use to see new paid orders to prepare, or shipments to track. Needs status; dates default to the last 7 days (KST).",
  schema: {
    status: z.enum(ORDER_STATUS).default("ACCEPT"),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("yyyy-MM-dd (KST), inclusive"),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("yyyy-MM-dd (KST), inclusive"),
    maxPerPage: z.number().int().min(1).max(50).default(50),
    nextToken: z.string().optional(),
  },
  handler: async (c, a) => {
    const now = new Date();
    const to = a.to ?? kstDate(now);
    const from = a.from ?? kstDate(new Date(now.getTime() - 7 * 86400_000));
    const res = await c.get<Envelope<Array<Record<string, unknown>>>>(`${openapi(c.vendorId, "v5")}/ordersheets`, {
      createdAtFrom: `${from}+09:00`,
      createdAtTo: `${to}+09:00`,
      status: a.status,
      maxPerPage: a.maxPerPage,
      nextToken: a.nextToken,
    });
    return { from, to, status: a.status, orders: (res.data ?? []).map(orderView), nextToken: res.nextToken || null };
  },
});

export const getOrder = define({
  name: "coupang_get_order",
  access: "read",
  description:
    "Get one Coupang order sheet by shipmentBoxId, with the latest receiver address (customers can change it after paying). " +
    "발주서 단건을 조회합니다. Use right before shipping to confirm the address, or after coupang_confirm_orders. Needs shipmentBoxId.",
  schema: { shipmentBoxId: z.number().int().positive() },
  handler: async (c, { shipmentBoxId }) => {
    const res = await c.get<Envelope<Array<Record<string, unknown>> | Record<string, unknown>>>(`${openapi(c.vendorId, "v5")}/ordersheets/${shipmentBoxId}`);
    const d = Array.isArray(res.data) ? res.data[0] : res.data;
    return d ? orderView(d) : null;
  },
});

export const confirmOrders = define({
  name: "coupang_confirm_orders",
  access: "write",
  description:
    "Acknowledge paid Coupang orders — moves them from ACCEPT (결제완료) to INSTRUCT (상품준비중). Up to 50 shipmentBoxIds per call; partial failures are reported per id. " +
    "발주서를 상품준비중으로 처리합니다. Use after reviewing new orders with coupang_list_orders. Needs shipmentBoxIds. Irreversible from the API.",
  schema: { shipmentBoxIds: z.array(z.number().int().positive()).min(1).max(50) },
  handler: async (c, { shipmentBoxIds }) => {
    const res = await c.patch<Envelope<{ responseCode?: number; responseMessage?: string; responseList?: Array<Record<string, unknown>> }>>(
      `${openapi(c.vendorId, "v4")}/ordersheets/acknowledgement`,
      { vendorId: c.vendorId, shipmentBoxIds },
    );
    const d = res.data ?? {};
    const codes: Record<number, string> = { 0: "all succeeded", 1: "partial errors", 99: "all failed", [-1]: "none" };
    return {
      result: codes[d.responseCode ?? -1] ?? String(d.responseCode),
      message: d.responseMessage ?? res.message ?? null,
      perOrder: (d.responseList ?? []).map((r) => ({ shipmentBoxId: r.shipmentBoxId, succeed: r.succeed, resultCode: r.resultCode, retryRequired: r.retryRequired, message: r.resultMessage })),
    };
  },
});

export const tools = [listProducts, getProduct, updateQuantity, updatePrice, listOrders, getOrder, confirmOrders] as const;
