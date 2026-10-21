/**
 * KakaoTalk message tools (Kakao Developers 메시지 API — not 알림톡, which needs a Kakao Business dealer).
 * Naming: kakao_<verb>_<object>. Access: read | write — sends go through approveWrite when provided.
 */
import { z } from "zod";
import type { KakaoClient } from "./client.js";

export type Access = "read" | "write";
export interface ToolDef<S extends z.ZodRawShape> {
  name: string;
  description: string;
  access: Access;
  schema: S;
  handler: (client: KakaoClient, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;

const linkSchema = z.object({
  web_url: z.string().url().optional(),
  mobile_web_url: z.string().url().optional(),
}).describe("Where the message/button opens. mobile_web_url defaults to web_url.");

const buttonSchema = z.object({ title: z.string().min(1).max(20), link: linkSchema });

/** Build Kakao's template_object JSON from a simple spec. Exported for tests and for OK Agent's notifier. */
export function buildTemplate(a: {
  text?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  buttonTitle?: string;
  buttons?: Array<{ title: string; link: { web_url?: string; mobile_web_url?: string } }>;
}): Record<string, unknown> {
  const link = (u?: string) => (u ? { web_url: u, mobile_web_url: u } : {});
  const buttons = a.buttons?.slice(0, 2).map((b) => ({ title: b.title, link: { web_url: b.link.web_url ?? b.link.mobile_web_url, mobile_web_url: b.link.mobile_web_url ?? b.link.web_url } }));
  if (a.title || a.imageUrl) {
    return {
      object_type: "feed",
      content: { title: a.title, description: a.description ?? a.text, image_url: a.imageUrl, link: link(a.url) },
      ...(a.buttonTitle ? { button_title: a.buttonTitle } : {}),
      ...(buttons?.length ? { buttons } : {}),
    };
  }
  return {
    object_type: "text",
    text: (a.text ?? "").slice(0, 200),
    link: link(a.url),
    ...(a.buttonTitle ? { button_title: a.buttonTitle } : {}),
    ...(buttons?.length ? { buttons } : {}),
  };
}

const messageFields = {
  text: z.string().min(1).max(200).describe("Message body (≤200 chars). Becomes the description when title/imageUrl is given."),
  title: z.string().max(100).optional().describe("Optional — switches to a feed card with this title"),
  imageUrl: z.string().url().optional().describe("Optional card image (https)"),
  url: z.string().url().optional().describe("Link the message/button opens. Must be a domain registered on the app's 플랫폼 > Web 설정."),
  buttonTitle: z.string().max(20).optional().describe("Button label, default 자세히 보기"),
  buttons: z.array(buttonSchema).max(2).optional().describe("Up to 2 custom buttons"),
};

export const sendToMe = define({
  name: "kakao_send_to_me",
  access: "write",
  description:
    "Send a KakaoTalk message to the connected account itself (나에게 보내기) — arrives in the '나와의 채팅' room. Text or a feed card with a link. " +
    "연결된 카카오 계정의 나와의 채팅방으로 메시지를 보냅니다. Use to notify the owner (reports, alerts, approval links) without any app install. Needs text; optional title/url.",
  schema: messageFields,
  handler: async (c, a) => {
    const template_object = JSON.stringify(buildTemplate(a));
    const res = await c.postForm<{ result_code: number }>("/v2/api/talk/memo/default/send", { template_object });
    return { sent: res.result_code === 0, result_code: res.result_code };
  },
});

export const sendToFriends = define({
  name: "kakao_send_to_friends",
  access: "write",
  description:
    "Send a KakaoTalk message to up to 5 friends by uuid (친구에게 보내기). Recipients must have the app connected too; partial failures are reported per uuid. " +
    "친구 uuid로 메시지를 보냅니다. Use after kakao_list_friends. Needs receiverUuids (≤5) and text. Daily per-sender limits apply.",
  schema: { receiverUuids: z.array(z.string().min(1)).min(1).max(5), ...messageFields },
  handler: async (c, a) => {
    const { receiverUuids, ...msg } = a;
    const res = await c.postForm<{ successful_receiver_uuids?: string[]; failure_info?: Array<{ code: number; msg: string; receiver_uuids: string[] }> }>(
      "/v1/api/talk/friends/message/default/send",
      { receiver_uuids: JSON.stringify(receiverUuids), template_object: JSON.stringify(buildTemplate(msg)) },
    );
    return { succeeded: res.successful_receiver_uuids ?? [], failed: res.failure_info ?? [] };
  },
});

export const listFriends = define({
  name: "kakao_list_friends",
  access: "read",
  description:
    "List KakaoTalk friends who also connected this app (uuid, nickname, profile thumbnail). Only those can receive kakao_send_to_friends. " +
    "앱에 연결된 카카오톡 친구 목록을 조회합니다. Use to find receiver uuids. Needs the app's 카카오톡 소셜 > 친구 목록 permission and the `friends` scope.",
  schema: {
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(100).default(100),
    order: z.enum(["asc", "desc"]).default("asc"),
  },
  handler: async (c, a) => {
    const res = await c.get<{ elements?: Array<Record<string, unknown>>; total_count?: number; after_url?: string | null }>("/v1/api/talk/friends", { offset: a.offset, limit: a.limit, order: a.order });
    return {
      total: res.total_count ?? 0,
      friends: (res.elements ?? []).map((f) => ({ uuid: f.uuid, nickname: f.profile_nickname, thumbnail: f.profile_thumbnail_image, favorite: f.favorite })),
      hasMore: !!res.after_url,
    };
  },
});

export const me = define({
  name: "kakao_me",
  access: "read",
  description:
    "Show which Kakao account is connected (id, nickname) and the granted scopes — a quick connectivity check. " +
    "연결된 카카오 계정과 동의 항목을 확인합니다. Use first when a send fails with a scope/token error. Needs nothing.",
  schema: {},
  handler: async (c) => {
    const [u, s] = await Promise.all([
      c.get<{ id: number; kakao_account?: { profile?: { nickname?: string } }; properties?: { nickname?: string } }>("/v2/user/me"),
      c.get<{ scopes?: Array<{ id: string; agreed: boolean }> }>("/v2/user/scopes").catch(() => ({ scopes: [] })),
    ]);
    return {
      id: u.id,
      nickname: u.kakao_account?.profile?.nickname ?? u.properties?.nickname ?? null,
      scopes: (s.scopes ?? []).filter((x) => x.agreed).map((x) => x.id),
    };
  },
});

export const tools = [me, sendToMe, listFriends, sendToFriends] as const;
