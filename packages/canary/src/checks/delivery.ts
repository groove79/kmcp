import { z } from "zod";
import { DeliveryClient, tools } from "@appmonster/mcp-delivery";
import type { Check, Ctx } from "../types.js";
import { callTool, byName } from "./_util.js";

const NEEDS = ["DELIVERY_TRACKER_CLIENT_ID", "DELIVERY_TRACKER_CLIENT_SECRET"];
const SIGNUP = "https://console.tracker.delivery (free: Create Project → Credentials; free-plan keys expire every 21 days → AUTH means renew)";
const client = (ctx: Ctx) => new DeliveryClient(ctx.env.DELIVERY_TRACKER_CLIENT_ID!, ctx.env.DELIVERY_TRACKER_CLIENT_SECRET!, { fetchImpl: ctx.fetchImpl });

export const checks: Check[] = [
  {
    id: "delivery.listCarriers", platform: "delivery", access: "read", needs: NEEDS, signup: SIGNUP,
    expect: z.object({ carriers: z.array(z.object({ id: z.string(), name: z.string() })).min(1) }).passthrough(),
    run: (ctx) => callTool(byName(tools, "delivery_list_carriers"), client(ctx), { searchText: "CJ", first: 5 }),
  },
  {
    // A real recent parcel, if provided (CANARY_TRACKING="CJ대한통운:1234567890"); otherwise a clean NOT_FOUND on a bogus number proves auth + schema.
    id: "delivery.trackParcel", platform: "delivery", access: "read", needs: NEEDS, signup: SIGNUP,
    expect: z.object({ status: z.string(), delivered: z.boolean(), events: z.array(z.unknown()) }).passthrough(),
    run: async (ctx) => {
      const spec = ctx.env.CANARY_TRACKING;
      if (spec) { const [carrier, no] = spec.split(":"); return callTool(byName(tools, "delivery_track_parcel"), client(ctx), { carrier, trackingNumber: no }); }
      try { await callTool(byName(tools, "delivery_track_parcel"), client(ctx), { carrier: "kr.cjlogistics", trackingNumber: "000000000000" }); return { status: "UNEXPECTED", delivered: false, events: [] }; }
      catch (e) { const err = e as { code?: string }; if (err.code === "NOT_FOUND" || err.code === "BAD_REQUEST") return { status: err.code, delivered: false, events: [], note: "bogus number rejected cleanly (auth + schema OK)" }; throw e; }
    },
  },
];
