#!/usr/bin/env node
/**
 *  mcp-kakao        → run the MCP server over stdio
 *  mcp-kakao auth   → one-time browser login: opens Kakao Login, catches the redirect on
 *                     http://localhost:8788/callback, stores the token in ~/.config/kmcp/kakao/<app>.json
 */
import http from "node:http";
import { randomBytes } from "node:crypto";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { approverFromEnv } from "@appmonster/approval";
import { KakaoAuth, FileTokenStore, DEFAULT_REDIRECT, DEFAULT_SCOPES } from "./auth.js";
import { createServer } from "./server.js";

const env = (k: string) => process.env[k]?.trim();
const clientId = env("KAKAO_REST_API_KEY");
const clientSecret = env("KAKAO_CLIENT_SECRET");
if (!clientId) {
  console.error(
    "Missing KAKAO_REST_API_KEY.\n" +
      "Create an app at https://developers.kakao.com → 앱 키 > REST API 키. Enable 카카오 로그인, add Redirect URI http://localhost:8788/callback, " +
      "and turn on the 동의항목 '카카오톡 메시지 전송' (talk_message).",
  );
  process.exit(1);
}

if (process.argv[2] === "auth") {
  const redirectUri = env("KAKAO_REDIRECT_URI") ?? DEFAULT_REDIRECT;
  const port = Number(new URL(redirectUri).port || 8788);
  const scopes = env("KAKAO_SCOPES")?.split(",").map((s) => s.trim()).filter(Boolean) ?? DEFAULT_SCOPES;
  const store = new FileTokenStore(FileTokenStore.defaultPath(clientId));
  const auth = new KakaoAuth({ clientId, clientSecret, redirectUri, scopes, store });
  const state = randomBytes(12).toString("hex");
  const url = auth.authorizeUrl(state);

  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url ?? "/", redirectUri);
    if (u.pathname !== new URL(redirectUri).pathname) { res.statusCode = 404; res.end(); return; }
    if (u.searchParams.get("state") !== state) { res.statusCode = 400; res.end("state mismatch"); return; }
    const code = u.searchParams.get("code");
    if (!code) { res.statusCode = 400; res.end(`missing code: ${u.searchParams.get("error_description") ?? u.searchParams.get("error") ?? ""}`); return; }
    try {
      const t = await auth.exchangeCode(code);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<h2>카카오 연결 완료 — 이 창을 닫아도 됩니다.</h2>");
      console.error(`✓ Token stored at ${FileTokenStore.defaultPath(clientId)} (scope: ${t.scope ?? "?"})`);
    } catch (e) {
      res.statusCode = 500; res.end(String(e));
      console.error("✗", e);
    } finally {
      setTimeout(() => process.exit(0), 200);
    }
  });
  srv.listen(port, "127.0.0.1", () => {
    console.error(`Open this URL in your browser:\n\n  ${url}\n\nWaiting for the redirect on ${redirectUri} …`);
    import("node:child_process").then(({ exec }) => exec(`${process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"} "${url}"`));
  });
} else {
  const server = createServer({ clientId, clientSecret, refreshToken: env("KAKAO_REFRESH_TOKEN"), approveWrite: approverFromEnv(process.env, { source: "kakao" }) });
  await server.connect(new StdioServerTransport());
}
