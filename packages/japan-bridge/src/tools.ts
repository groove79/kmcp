/**
 * Japan → Korea bridge tools. Naming: jp_<verb>_<object>. All read-only (drafts are returned, never posted).
 */
import { z } from "zod";
import { landedCost } from "./cost.js";

export type Access = "read" | "write";
export interface Ctx {
  fetchImpl: typeof fetch;
  rakutenAppId?: string;
  rakutenAccessKey?: string;
  rakutenReferer?: string;
  yahooAppId?: string;
  defaults: { shippingBaseJpy: number; shippingPerKgJpy: number; platformFeeRate: number };
}
export interface ToolDef<S extends z.ZodRawShape> {
  name: string;
  description: string;
  access: Access;
  schema: S;
  handler: (ctx: Ctx, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

async function getJson<T>(ctx: Ctx, url: URL, headers: Record<string, string> = {}): Promise<T> {
  const res = await ctx.fetchImpl(url, { headers: { Accept: "application/json", ...headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${url.host} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

export const RAKUTEN_URL = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
export const YAHOO_URL = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";
export const FX_URL = "https://open.er-api.com/v6/latest/JPY";

export const searchRakuten = define({
  name: "jp_search_rakuten",
  access: "read",
  description:
    "Search Rakuten Ichiba (楽天市場) products by keyword: name, JPY price, shop, image, review score, stock, postage flag, item URL. " +
    "라쿠텐 상품을 검색합니다. Use to source Japanese items for a Korean listing; pass results to jp_landed_cost. Needs a keyword; RAKUTEN_APP_ID + RAKUTEN_ACCESS_KEY env.",
  schema: {
    keyword: z.string().min(1),
    sort: z.enum(["standard", "+itemPrice", "-itemPrice", "-reviewCount", "-reviewAverage", "-updateTimestamp"]).default("standard"),
    minPrice: z.number().int().positive().optional(),
    maxPrice: z.number().int().positive().optional(),
    hits: z.number().int().min(1).max(30).default(10),
    page: z.number().int().min(1).max(100).default(1),
    inStockOnly: z.boolean().default(true),
  },
  handler: async (ctx, a) => {
    if (!ctx.rakutenAppId || !ctx.rakutenAccessKey) throw new Error("Set RAKUTEN_APP_ID and RAKUTEN_ACCESS_KEY (free at https://webservice.rakuten.co.jp).");
    const url = new URL(RAKUTEN_URL);
    const q: Record<string, string | number | undefined> = { applicationId: ctx.rakutenAppId, accessKey: ctx.rakutenAccessKey, formatVersion: 2, keyword: a.keyword, sort: a.sort, hits: a.hits, page: a.page, availability: a.inStockOnly ? 1 : 0, imageFlag: 1, minPrice: a.minPrice, maxPrice: a.maxPrice };
    for (const [k, v] of Object.entries(q)) if (v !== undefined) url.searchParams.set(k, String(v));
    // Rakuten apps registered since 2026 carry an allowed-referrer (or IP) list; a stdio tool runs on each user's
    // machine, so we identify ourselves by Referer and the app is registered with the repo domain allowed.
    const res = await getJson<{ count?: number; page?: number; pageCount?: number; items?: Array<Record<string, unknown>> }>(ctx, url, { Referer: ctx.rakutenReferer ?? "https://github.com/groove79/kmcp" });
    return {
      total: res.count ?? 0, page: res.page ?? a.page, pageCount: res.pageCount ?? null,
      items: (res.items ?? []).map((it) => ({
        source: "rakuten", itemCode: it.itemCode, name: it.itemName, priceJpy: it.itemPrice, shop: it.shopName, url: it.itemUrl,
        image: Array.isArray(it.mediumImageUrls) ? (it.mediumImageUrls as string[])[0] : undefined,
        reviewAverage: it.reviewAverage, reviewCount: it.reviewCount, inStock: it.availability === 1, postageIncluded: it.postageFlag === 0,
      })),
    };
  },
});

export const searchYahoo = define({
  name: "jp_search_yahoo",
  access: "read",
  description:
    "Search Yahoo! JAPAN Shopping products by keyword: name, JPY price, seller, image, reviews, stock, free-shipping flag, URL. 1 request/sec limit. " +
    "야후재팬 쇼핑 상품을 검색합니다. Use alongside jp_search_rakuten to compare Japanese prices. Needs a keyword; YAHOO_JP_APP_ID env.",
  schema: {
    query: z.string().min(1),
    sort: z.enum(["-score", "+price", "-price", "-review_count"]).default("-score"),
    priceFrom: z.number().int().positive().optional(),
    priceTo: z.number().int().positive().optional(),
    results: z.number().int().min(1).max(50).default(10),
    start: z.number().int().min(1).default(1),
    inStockOnly: z.boolean().default(true),
    condition: z.enum(["new", "used"]).optional(),
  },
  handler: async (ctx, a) => {
    if (!ctx.yahooAppId) throw new Error("Set YAHOO_JP_APP_ID (free Client ID at https://e.developer.yahoo.co.jp).");
    const url = new URL(YAHOO_URL);
    const q: Record<string, string | number | boolean | undefined> = { appid: ctx.yahooAppId, query: a.query, sort: a.sort, results: a.results, start: a.start, price_from: a.priceFrom, price_to: a.priceTo, in_stock: a.inStockOnly ? true : undefined, condition: a.condition };
    for (const [k, v] of Object.entries(q)) if (v !== undefined) url.searchParams.set(k, String(v));
    const res = await getJson<{ totalResultsAvailable?: number; hits?: Array<Record<string, unknown>> }>(ctx, url);
    return {
      total: res.totalResultsAvailable ?? 0,
      items: (res.hits ?? []).map((h) => {
        const img = h.image as { medium?: string } | undefined, seller = h.seller as { name?: string } | undefined, rv = h.review as { rate?: number; count?: number } | undefined, sh = h.shipping as { code?: number } | undefined;
        return { source: "yahoo", itemCode: h.code, name: h.name, priceJpy: h.price, shop: seller?.name, url: h.url, image: img?.medium, reviewAverage: rv?.rate, reviewCount: rv?.count, inStock: h.inStock, postageIncluded: sh?.code === 2 };
      }),
    };
  },
});

export const fxRate = define({
  name: "jp_fx_rate",
  access: "read",
  description:
    "Current JPY→KRW and USD→KRW mid-market rates (open.er-api.com, refreshed daily) for use in jp_landed_cost. Customs uses its own weekly rate; this is for estimates. " +
    "엔·달러 환율을 가져옵니다. Use before jp_landed_cost unless you already have rates. Needs nothing.",
  schema: {},
  handler: async (ctx) => {
    const res = await getJson<{ result?: string; time_last_update_utc?: string; rates?: Record<string, number> }>(ctx, new URL(FX_URL));
    const krwPerJpy = res.rates?.KRW, usdPerJpy = res.rates?.USD;
    if (!krwPerJpy || !usdPerJpy) throw new Error("FX source returned no KRW/USD rates");
    return { jpyToKrw: Math.round(krwPerJpy * 10000) / 10000, usdToKrw: Math.round((krwPerJpy / usdPerJpy) * 100) / 100, asOf: res.time_last_update_utc ?? null, source: "open.er-api.com (mid-market)" };
  },
});

export const landedCostTool = define({
  name: "jp_landed_cost",
  access: "read",
  description:
    "Compute the full Korea landed cost of a Japanese item and a suggested Smart Store price: JPY→KRW, forwarder shipping, Korean customs (USD 150 de minimis, 간이세율 20% or duty+VAT), marketplace fees, target margin. Pure calculation, explains every step. " +
    "일본 상품의 한국 도착 원가와 권장 판매가를 계산합니다. Use after picking an item; give priceJpy and rates (from jp_fx_rate). Needs priceJpy, jpyToKrw, usdToKrw; optional weight, shipping, tax mode, margin.",
  schema: {
    priceJpy: z.number().positive(),
    quantity: z.number().int().min(1).default(1),
    weightKg: z.number().positive().optional(),
    shippingJpy: z.number().min(0).optional().describe("International shipping for the parcel; overrides the base+per-kg estimate"),
    domesticShippingJpy: z.number().min(0).default(0).describe("JP domestic shipping to the forwarder (0 if 送料無料)"),
    jpyToKrw: z.number().positive(),
    usdToKrw: z.number().positive(),
    taxMode: z.enum(["simple", "general"]).default("simple").describe("simple = 간이세율(특송/우편), general = 관세율 + 부가세"),
    simpleRate: z.number().min(0).max(1).default(0.2),
    dutyRate: z.number().min(0).max(1).default(0.08).describe("HS-code duty rate for general mode (의류 13%, 일반 8%…)"),
    dutyFreeUsd: z.number().positive().default(150),
    platformFeeRate: z.number().min(0).max(0.5).optional().describe("Default from env BRIDGE_PLATFORM_FEE_RATE (0.06)"),
    targetMarginRate: z.number().min(0).max(0.9).default(0.2),
    extraKrw: z.number().min(0).default(0),
  },
  handler: async (ctx, a) => landedCost({ ...a, shippingBaseJpy: ctx.defaults.shippingBaseJpy, shippingPerKgJpy: ctx.defaults.shippingPerKgJpy, platformFeeRate: a.platformFeeRate ?? ctx.defaults.platformFeeRate }),
});

export const listingDraft = define({
  name: "jp_listing_draft",
  access: "read",

  description:
    "Build a Naver Smart Store listing draft for a Japanese item: Korean title/description slots, price from jp_landed_cost, images, origin 일본, plus the 해외구매대행 disclosures Korean law requires (shipping days, customs, no-return cases, 개인통관고유부호). Returns JSON for review — nothing is posted. " +
    "스마트스토어 등록 초안을 만듭니다. Use after jp_landed_cost; the agent writes the Korean title/description, this tool supplies structure and mandatory notices. Needs the item and the suggested price.",
  schema: {
    item: z.object({ name: z.string(), priceJpy: z.number(), url: z.string().url(), image: z.string().url().optional(), shop: z.string().optional(), source: z.enum(["rakuten", "yahoo", "other"]).default("other") }),
    titleKo: z.string().min(1).max(100).describe("Korean product title written by the agent (brand + model + key spec, ≤100자)"),
    descriptionKo: z.string().min(1).describe("Korean description written by the agent"),
    sellPriceKrw: z.number().int().positive(),
    leadTimeDays: z.number().int().min(3).max(60).default(10),
    categoryHint: z.string().optional(),
    stockQuantity: z.number().int().min(0).default(10),
  },
  handler: async (_ctx, a) => {
    const notice =
      `[해외구매대행 안내]\n` +
      `· 본 상품은 일본 현지에서 구매 후 국제배송되는 해외구매대행 상품입니다. 주문 후 평균 ${a.leadTimeDays}일 소요됩니다.\n` +
      `· 통관을 위해 수취인의 개인통관고유부호가 필요합니다.\n` +
      `· 판매가에 관세·부가세가 포함되어 있습니다(목록통관 기준). 합산과세 발생 시 추가 세금은 구매자 부담입니다.\n` +
      `· 해외 주문 특성상 단순 변심 반품은 국제 왕복 배송비가 부과되며, 현지 발주 후 취소가 제한됩니다.\n` +
      `· 전압·규격은 일본 기준(100V)일 수 있습니다.`;
    return {
      naver: {
        originProduct: {
          statusType: "SALE",
          saleType: "NEW",
          name: a.titleKo,
          detailContent: `${a.descriptionKo}\n\n${notice}`,
          salePrice: a.sellPriceKrw,
          stockQuantity: a.stockQuantity,
          images: a.item.image ? { representativeImage: { url: a.item.image } } : undefined,
          detailAttribute: {
            originAreaInfo: { originAreaCode: "03", content: "일본", plural: false, importer: "해외구매대행" },
            afterServiceInfo: { afterServiceTelephoneNumber: "<판매자 연락처>", afterServiceGuideContent: "해외구매대행 상품으로 A/S는 제조사 정책을 따릅니다." },
            minorPurchasable: true,
            purchaseQuantityInfo: { maxPurchaseQuantityPerOrder: 5 },
          },
          deliveryInfo: { deliveryType: "DELIVERY", deliveryAttributeType: "NORMAL", deliveryFee: { deliveryFeeType: "FREE" }, claimDeliveryInfo: { returnDeliveryFee: 30000, exchangeDeliveryFee: 30000 } },
        },
        smartstoreChannelProduct: { naverShoppingRegistration: true, channelProductDisplayStatusType: "ON" },
      },
      source: a.item,
      categoryHint: a.categoryHint ?? null,
      checklist: [
        "네이버 카테고리(leafCategoryId) 선택 — 해외구매대행은 카테고리별 고시정보 필수",
        "상품정보제공고시(productInfoProvidedNotice) 항목 채우기",
        "이미지는 라쿠텐/야후 원본을 그대로 쓰지 말고 판매자 권한이 있는 이미지 사용",
        "판매자 연락처·반품지 주소 입력",
        "상표권 있는 브랜드는 병행수입 고지 확인",
      ],
    };
  },
});

export const tools = [searchRakuten, searchYahoo, fxRate, landedCostTool, listingDraft] as const;
