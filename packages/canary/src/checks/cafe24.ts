import { z } from "zod";
import { Cafe24Auth, Cafe24Client, tools, type TokenSet } from "@appmonster/mcp-cafe24";
import type { Check, Ctx } from "../types.js";
import { bagTokenStore } from "../secrets.js";
import { callTool, byName, sleep } from "./_util.js";

const NEEDS = ["CAFE24_MALL_ID", "CAFE24_CLIENT_ID", "CAFE24_CLIENT_SECRET", "CAFE24_REFRESH_TOKEN"];
export const ROTATING = ["CAFE24_TOKENSET"]; // JSON TokenSet row in the bag

function client(ctx: Ctx) {
  const { env } = ctx;
  const store = bagTokenStore<TokenSet>(ctx.tokens, "CAFE24_TOKENSET", () =>
    env.CAFE24_REFRESH_TOKEN ? { access_token: "", refresh_token: env.CAFE24_REFRESH_TOKEN, expires_at: 0, refresh_expires_at: Date.now() + 14 * 86400_000 } : null);
  const auth = new Cafe24Auth({ mallId: env.CAFE24_MALL_ID!, clientId: env.CAFE24_CLIENT_ID!, clientSecret: env.CAFE24_CLIENT_SECRET!, store, fetchImpl: ctx.fetchImpl });
  return new Cafe24Client(auth, { fetchImpl: ctx.fetchImpl });
}

export const checks: Check[] = [
  {
    id: "cafe24.listProducts", platform: "cafe24", access: "read", needs: NEEDS,
    expect: z.object({ products: z.array(z.object({ product_no: z.number(), product_name: z.string(), price: z.string(), display: z.string(), selling: z.string() })) }),
    run: (ctx) => callTool(byName(tools, "cafe24_list_products"), client(ctx), { limit: 5 }),
  },
  {
    id: "cafe24.getProduct", platform: "cafe24", access: "read", needs: NEEDS,
    expect: z.object({ product: z.object({ product_no: z.number() }), variants: z.array(z.object({ variant_code: z.string(), quantity: z.number() })) }),
    run: async (ctx) => {
      const c = client(ctx);
      const list = await callTool(byName(tools, "cafe24_list_products"), c, { limit: 1 }) as { products: Array<{ product_no: number }> };
      return callTool(byName(tools, "cafe24_get_product"), c, { product_no: list.products[0].product_no });
    },
  },
  {
    id: "cafe24.listOrders", platform: "cafe24", access: "read", needs: NEEDS,
    expect: z.object({ orders: z.array(z.unknown()) }),
    run: (ctx) => callTool(byName(tools, "cafe24_list_orders"), client(ctx), { start_date: ctx.today, end_date: ctx.today, limit: 5 }),
  },
  {
    id: "cafe24.listBoards", platform: "cafe24", access: "read", needs: NEEDS,
    expect: z.object({ boards: z.array(z.object({ board_no: z.number(), board_name: z.string() })) }),
    run: (ctx) => callTool(byName(tools, "cafe24_list_boards"), client(ctx), {}),
  },
  {
    // sandbox mall only (appmonster test mall): first variant of the first product, 0 → 7 → back
    id: "cafe24.updateInventory", platform: "cafe24", access: "write-sandbox", needs: NEEDS,
    expect: z.object({ inventory: z.object({ variant_code: z.string(), quantity: z.number() }), note: z.string() }),
    run: async (ctx) => {
      const c = client(ctx);
      const list = await callTool(byName(tools, "cafe24_list_products"), c, { limit: 1 }) as { products: Array<{ product_no: number }> };
      const pno = list.products[0].product_no;
      const detail = await callTool(byName(tools, "cafe24_get_product"), c, { product_no: pno }) as { variants: Array<{ variant_code: string; quantity: number }> };
      const v = detail.variants[0];
      const out = await callTool(byName(tools, "cafe24_update_inventory"), c, { product_no: pno, variant_code: v.variant_code, quantity: 7 }) as Record<string, unknown>;
      return { ...out, _revert: { pno, variant_code: v.variant_code, quantity: v.quantity } };
    },
    revert: async (ctx, out) => {
      const r = (out as { _revert: { pno: number; variant_code: string; quantity: number } })._revert;
      await sleep(1500);
      await callTool(byName(tools, "cafe24_update_inventory"), client(ctx), { product_no: r.pno, variant_code: r.variant_code, quantity: r.quantity });
    },
  },
];
