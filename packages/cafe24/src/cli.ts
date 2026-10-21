#!/usr/bin/env node
/**
 *  mcp-cafe24         → run the MCP server over stdio
 *  mcp-cafe24 auth    → one-time browser login: prints the authorize URL, catches the redirect on
 *                       http://localhost:8787/callback, stores the token in ~/.config/kmcp/cafe24/<mall>.json
 */
import http from "node:http";
import { randomBytes } from "node:crypto";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Cafe24Auth, FileTokenStore } from "./auth.js";
import { approverFromEnv } from "@appmonster/approval";
import { createServer } from "./server.js";

const env = (k: string) => process.env[k]?.trim();
const mallId = env("CAFE24_MALL_ID");
const clientId = env("CAFE24_CLIENT_ID");
const clientSecret = env("CAFE24_CLIENT_SECRET");
if (!mallId || !clientId || !clientSecret) {
  console.error(
    "Missing CAFE24_MALL_ID / CAFE24_CLIENT_ID / CAFE24_CLIENT_SECRET.\n" +
      "Create an app at https://developers.cafe24.com (Redirect URI: http://localhost:8787/callback) and put the values in your MCP client config env.",
  );
  process.exit(1);
}

if (process.argv[2] === "auth") {
  const redirectUri = env("CAFE24_REDIRECT_URI") ?? "http://localhost:8787/callback";
  const port = Number(new URL(redirectUri).port || 8787);
  const store = new FileTokenStore(FileTokenStore.defaultPath(mallId));
  const auth = new Cafe24Auth({ mallId, clientId, clientSecret, redirectUri, store });
  const state = randomBytes(12).toString("hex");
  const url = auth.authorizeUrl(state);

  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url ?? "/", redirectUri);
    if (u.pathname !== new URL(redirectUri).pathname) { res.statusCode = 404; res.end(); return; }
    if (u.searchParams.get("state") !== state) { res.statusCode = 400; res.end("state mismatch"); return; }
    const code = u.searchParams.get("code");
    if (!code) { res.statusCode = 400; res.end("missing code"); return; }
    try {
      const t = await auth.exchangeCode(code);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<h2>카페24 연결 완료 — 이 창을 닫아도 됩니다.</h2>");
      console.error(`✓ Token stored at ${FileTokenStore.defaultPath(mallId)} (scopes: ${t.scopes?.join(", ")})`);
    } catch (e) {
      res.statusCode = 500; res.end(String(e));
      console.error("✗", e);
    } finally {
      setTimeout(() => process.exit(0), 200);
    }
  });
  srv.listen(port, "127.0.0.1", () => {
    console.error(`Open this URL in your browser (logged in to the ${mallId} admin):\n\n  ${url}\n\nWaiting for the redirect on ${redirectUri} …`);
    import("node:child_process").then(({ exec }) => exec(`${process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"} "${url}"`));
  });
} else {
  const server = createServer({
    mallId, clientId, clientSecret,
    refreshToken: env("CAFE24_REFRESH_TOKEN"),
    apiVersion: env("CAFE24_API_VERSION"),
    shopNo: env("CAFE24_SHOP_NO") ? Number(env("CAFE24_SHOP_NO")) : undefined,
    approveWrite: approverFromEnv(process.env, { source: "cafe24" }),
  });
  await server.connect(new StdioServerTransport());
}
