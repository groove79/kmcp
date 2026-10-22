/**
 * Parcel tracking tools. Naming: delivery_<verb>_<object>. All read-only.
 */
import { z } from "zod";
import type { DeliveryClient } from "./client.js";
import { resolveCarrier, STATUS_KO, CARRIER_ALIASES } from "./carriers.js";

export type Access = "read" | "write";
export interface ToolDef<S extends z.ZodRawShape> {
  name: string;
  description: string;
  access: Access;
  schema: S;
  handler: (client: DeliveryClient, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

const TRACK_QUERY = `query Track($carrierId: ID!, $trackingNumber: String!, $first: Int) {
  track(carrierId: $carrierId, trackingNumber: $trackingNumber) {
    trackingNumber
    lastEvent { time status { code name } description location { name } }
    events(first: $first) { edges { node { time status { code name } description location { name } } } }
  }
}`;
const CARRIERS_QUERY = `query Carriers($searchText: String, $countryCode: String, $first: Int, $after: String) {
  carriers(searchText: $searchText, countryCode: $countryCode, first: $first, after: $after) {
    edges { node { id name } }
    pageInfo { hasNextPage endCursor }
  }
}`;

interface RawEvent { time?: string | null; status: { code: string; name?: string | null }; description?: string | null; location?: { name?: string | null } | null }
interface RawTrack { trackingNumber: string; lastEvent?: RawEvent | null; events?: { edges: Array<{ node: RawEvent }> } | null }

const toKst = (iso?: string | null) => iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace(" ", "T") + "+09:00" : null;
const view = (e: RawEvent) => ({ time: toKst(e.time), status: e.status.code, statusKo: STATUS_KO[e.status.code]?.ko ?? e.status.name ?? e.status.code, description: e.description ?? null, location: e.location?.name ?? null });

export async function resolveCarrierId(c: DeliveryClient, carrier: string): Promise<{ id: string; resolvedBy: "alias" | "search" }> {
  const local = resolveCarrier(carrier);
  if (local) return { id: local, resolvedBy: "alias" };
  const r = await c.query<{ carriers: { edges: Array<{ node: { id: string; name: string } }> } }>(CARRIERS_QUERY, { searchText: carrier, first: 5 });
  const hit = r.carriers.edges[0]?.node;
  if (!hit) throw new Error(`Unknown carrier "${carrier}". Try delivery_list_carriers to find the id (e.g. kr.cjlogistics, kr.epost).`);
  return { id: hit.id, resolvedBy: "search" };
}

export async function trackOne(c: DeliveryClient, carrier: string, trackingNumber: string, first = 20) {
  const { id: carrierId, resolvedBy } = await resolveCarrierId(c, carrier);
  const number = trackingNumber.replace(/[\s-]/g, "");
  const r = await c.query<{ track: RawTrack | null }>(TRACK_QUERY, { carrierId, trackingNumber: number, first });
  if (!r.track) throw new Error(`No tracking info for ${carrierId} ${number}.`);
  const last = r.track.lastEvent ? view(r.track.lastEvent) : null;
  const events = (r.track.events?.edges ?? []).map((e) => view(e.node));
  const code = last?.status ?? events.at(-1)?.status ?? "UNKNOWN";
  return {
    carrierId, carrierResolvedBy: resolvedBy, trackingNumber: number,
    status: code, statusKo: STATUS_KO[code]?.ko ?? code,
    delivered: code === "DELIVERED",
    needsAttention: code === "EXCEPTION" || code === "ATTEMPT_FAIL",
    lastEvent: last, events,
  };
}

export const trackParcel = define({
  name: "delivery_track_parcel",
  access: "read",
  description:
    "Track one parcel: current status (접수/집화/이동중/배송출발/배송완료/배송실패/수령대기/이상), last event, full event history with KST times. Carrier can be a Korean or English name (CJ대한통운, 우체국, 한진, 롯데, 로젠, 쿠팡, 야마토, DHL…) or a Delivery Tracker id like kr.cjlogistics. " +
    "운송장 1건을 조회합니다. Use for '이 주문 어디쯤이야?' or to confirm delivery before a settlement/CS reply. Needs carrier + trackingNumber; DELIVERY_TRACKER_CLIENT_ID/SECRET env.",
  schema: {
    carrier: z.string().min(1).describe("Carrier name or id, e.g. CJ대한통운, 우체국, kr.hanjin"),
    trackingNumber: z.string().min(5).describe("운송장 번호 — hyphens/spaces are ignored"),
    maxEvents: z.number().int().min(1).max(100).default(20),
  },
  handler: (c, a) => trackOne(c, a.carrier, a.trackingNumber, a.maxEvents),
});

export const trackMany = define({
  name: "delivery_track_many",
  access: "read",
  description:
    "Track up to 20 parcels in one call and get a compact table: status per parcel plus counts of delivered / in transit / needs attention. Each item may carry your own reference (orderId) that is echoed back. " +
    "여러 운송장을 한 번에 조회합니다. Use after naver_list_orders / coupang_list_orders to answer '오늘 발송분 어디쯤?' or to find stuck parcels. Needs parcels[] of {carrier, trackingNumber, ref?}.",
  schema: {
    parcels: z.array(z.object({ carrier: z.string().min(1), trackingNumber: z.string().min(5), ref: z.string().optional().describe("Your order id / note, echoed back") })).min(1).max(20),
  },
  handler: async (c, a) => {
    const results = await Promise.all(a.parcels.map(async (p) => {
      try { const t = await trackOne(c, p.carrier, p.trackingNumber, 1); return { ref: p.ref ?? null, carrierId: t.carrierId, trackingNumber: t.trackingNumber, status: t.status, statusKo: t.statusKo, delivered: t.delivered, needsAttention: t.needsAttention, lastTime: t.lastEvent?.time ?? null, lastLocation: t.lastEvent?.location ?? null, lastDescription: t.lastEvent?.description ?? null, error: null }; }
      catch (e) { return { ref: p.ref ?? null, carrierId: null, trackingNumber: p.trackingNumber, status: "ERROR", statusKo: "조회 실패", delivered: false, needsAttention: true, lastTime: null, lastLocation: null, lastDescription: null, error: (e as Error).message.slice(0, 200) }; }
    }));
    const summary = { total: results.length, delivered: results.filter((r) => r.delivered).length, inTransit: results.filter((r) => !r.delivered && !r.needsAttention).length, needsAttention: results.filter((r) => r.needsAttention).length };
    return { summary, parcels: results };
  },
});

export const listCarriers = define({
  name: "delivery_list_carriers",
  access: "read",
  description:
    "List carriers Delivery Tracker supports (id + name), optionally filtered by text, plus the built-in Korean/Japanese aliases this server understands. " +
    "지원 택배사 목록을 조회합니다. Use when a carrier name is ambiguous or to get the id for delivery_track_parcel. Needs nothing; optional searchText.",
  schema: {
    searchText: z.string().optional().describe("e.g. 한진, yamato"),
    countryCode: z.string().length(2).optional().describe("ISO 3166-1 alpha-2, affects ordering"),
    first: z.number().int().min(1).max(100).default(50),
  },
  handler: async (c, a) => {
    const r = await c.query<{ carriers: { edges: Array<{ node: { id: string; name: string } }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }>(CARRIERS_QUERY, { searchText: a.searchText, countryCode: a.countryCode, first: a.first });
    return {
      carriers: r.carriers.edges.map((e) => ({ id: e.node.id, name: e.node.name, aliases: CARRIER_ALIASES[e.node.id] ?? [] })),
      hasMore: r.carriers.pageInfo.hasNextPage,
      note: "Pass either the id (kr.cjlogistics) or any alias/name to delivery_track_parcel.",
    };
  },
});

export const tools = [trackParcel, trackMany, listCarriers] as const;
