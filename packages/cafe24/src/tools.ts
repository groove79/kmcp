import { z } from "zod";
import type { Cafe24Client } from "./client.js";

export type Access = "read" | "write";
export interface ToolDef<S extends z.ZodRawShape> {
  name: string; description: string; access: Access; schema: S;
  handler: (client: Cafe24Client, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

const day = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);

export const listProducts = define({
  name: "cafe24_list_products",
  access: "read",
  description:
    "List products in the Cafe24 mall with paging and filters (name, display/selling status, product numbers). " +
    "카페24 상품 목록을 조회합니다. Use first to find product_no before reading or changing a product. Needs nothing.",
  schema: {
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
    product_name: z.string().optional().describe("Partial name match"),
    display: z.enum(["T", "F"]).optional().describe("T = shown in store, F = hidden"),
    selling: z.enum(["T", "F"]).optional().describe("T = on sale, F = not selling"),
    product_no: z.array(z.number().int()).optional().describe("Specific product numbers"),
  },
  handler: (c, a) => c.get("/products", { limit: a.limit, offset: a.offset, product_name: a.product_name, display: a.display, selling: a.selling, product_no: a.product_no?.join(",") }),
});

export const getProduct = define({
  name: "cafe24_get_product",
  access: "read",
  description:
    "Get one product with its variants (options), prices, stock and status by product_no. " +
    "상품 상세(옵션·재고 포함)를 조회합니다. Use before cafe24_update_inventory to get variant_code. Needs product_no.",
  schema: { product_no: z.number().int() },
  handler: async (c, { product_no }) => {
    const [product, variants] = await Promise.all([
      c.get<{ product: unknown }>(`/products/${product_no}`, { embed: "variants" }),
      c.get<{ variants: unknown[] }>(`/products/${product_no}/variants`).catch(() => ({ variants: [] })),
    ]);
    return { ...product, variants: variants.variants };
  },
});

export const updateProduct = define({
  name: "cafe24_update_product",
  access: "write",
  description:
    "Change a product's name, price, display or selling status. Only the fields you pass are changed. " +
    "상품의 이름·가격·진열·판매 상태를 수정합니다. IRREVERSIBLE: changes the live store. Needs product_no + at least one field.",
  schema: {
    product_no: z.number().int(),
    product_name: z.string().optional(),
    price: z.number().min(0).optional().describe("Sale price in KRW"),
    display: z.enum(["T", "F"]).optional(),
    selling: z.enum(["T", "F"]).optional(),
  },
  handler: (c, { product_no, ...fields }) => {
    const request = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    if (Object.keys(request).length === 0) throw new Error("Pass at least one of product_name, price, display, selling.");
    return c.put(`/products/${product_no}`, { shop_no: c.shopNo, request });
  },
});

export const updateInventory = define({
  name: "cafe24_update_inventory",
  access: "write",
  description:
    "Set the stock quantity of one variant (option) of a product. " +
    "옵션(품목) 재고 수량을 변경합니다. IRREVERSIBLE. Needs product_no + variant_code (from cafe24_get_product → variants[].variant_code) + quantity.",
  schema: {
    product_no: z.number().int(),
    variant_code: z.string().describe("Variant code like P000000A000A"),
    quantity: z.number().int().min(0),
  },
  handler: async (c, { product_no, variant_code, quantity }) => {
    const r = await c.put<{ inventory?: unknown }>(`/products/${product_no}/variants/${variant_code}/inventories`, { shop_no: c.shopNo, request: { quantity, use_inventory: "T" } });
    return {
      ...r,
      // Verified live (2026-10): the PUT response already reflects the new quantity, but a GET within ~1–2 s can still return the old value.
      note: "Applied. Cafe24 reads can lag 1–2 seconds after a write — re-read after a short wait if you need to confirm.",
    };
  },
});

export const listOrders = define({
  name: "cafe24_list_orders",
  access: "read",
  description:
    "List orders in a date range (default: last 7 days) with items and buyer, optionally filtered by status. " +
    "주문 목록을 조회합니다(품목·구매자 포함). Use for 'any new orders?'. Needs nothing; max 3-month range per call.",
  schema: {
    start_date: z.string().optional().describe("YYYY-MM-DD, default 7 days ago"),
    end_date: z.string().optional().describe("YYYY-MM-DD, default today"),
    order_status: z.string().optional().describe("Comma-separated codes, e.g. N00 (new), N10 (paid), N20 (preparing), N40 (shipped)"),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
  },
  handler: (c, a) => c.get("/orders", {
    start_date: a.start_date ?? day(new Date(Date.now() - 7 * 86400_000)),
    end_date: a.end_date ?? day(new Date()),
    order_status: a.order_status,
    embed: "items,buyer,receivers",
    limit: a.limit, offset: a.offset,
  }),
});

export const listBoards = define({
  name: "cafe24_list_boards",
  access: "read",
  description: "List the mall's boards (notice, Q&A, review, free) with their board_no. 게시판 목록을 조회합니다. Use before posting. Needs nothing.",
  schema: {},
  handler: (c) => c.get("/boards"),
});

export const createArticle = define({
  name: "cafe24_create_article",
  access: "write",
  description:
    "Post an article to a board (e.g. a notice or blog-style post). HTML allowed in content. " +
    "게시판에 글을 등록합니다. IRREVERSIBLE: publishes to the live site. Needs board_no (from cafe24_list_boards), title, content.",
  schema: {
    board_no: z.number().int(),
    title: z.string().min(1).max(200),
    content: z.string().min(1).describe("HTML or plain text"),
    writer: z.string().default("관리자"),
    display: z.enum(["T", "F"]).default("T"),
  },
  handler: (c, { board_no, title, content, writer, display }) =>
    c.post(`/boards/${board_no}/articles`, { shop_no: c.shopNo, requests: [{ title, content, writer, display }] }),
});

export const tools = [listProducts, getProduct, updateProduct, updateInventory, listOrders, listBoards, createArticle] as const;
