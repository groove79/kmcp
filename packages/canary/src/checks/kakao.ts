import { z } from "zod";
import { KakaoAuth, KakaoClient, tools, type TokenSet } from "@appmonster/mcp-kakao";
import type { Check, Ctx } from "../types.js";
import { bagTokenStore } from "../secrets.js";
import { callTool, byName } from "./_util.js";

const NEEDS = ["KAKAO_REST_API_KEY", "KAKAO_REFRESH_TOKEN"];
export const ROTATING = ["KAKAO_TOKENSET"];

export function kakaoClient(ctx: Ctx) {
  const { env } = ctx;
  const store = bagTokenStore<TokenSet>(ctx.tokens, "KAKAO_TOKENSET", () =>
    env.KAKAO_REFRESH_TOKEN ? { access_token: "", refresh_token: env.KAKAO_REFRESH_TOKEN, expires_at: 0, refresh_expires_at: Date.now() + 30 * 86400_000 } : null);
  const auth = new KakaoAuth({ clientId: env.KAKAO_REST_API_KEY!, clientSecret: env.KAKAO_CLIENT_SECRET, store, fetchImpl: ctx.fetchImpl });
  return new KakaoClient(auth, { fetchImpl: ctx.fetchImpl });
}

export const checks: Check[] = [
  {
    id: "kakao.me", platform: "kakao", access: "read", needs: NEEDS,
    expect: z.object({ id: z.union([z.number(), z.string()]) }).passthrough(),
    run: (ctx) => callTool(byName(tools, "kakao_me"), kakaoClient(ctx), {}),
  },
  {
    // The daily "canary ok" message is also the proof that the alert channel works.
    id: "kakao.sendToMe", platform: "kakao", access: "write-sandbox", needs: NEEDS,
    expect: z.object({ result_code: z.literal(0) }).passthrough(),
    run: (ctx) => callTool(byName(tools, "kakao_send_to_me"), kakaoClient(ctx), { text: `🐤 K-MCP 카나리 ${ctx.today} — 알림 채널 정상` }),
  },
];
