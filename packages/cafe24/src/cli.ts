#!/usr/bin/env node
/**
 *  mcp-cafe24         → run the MCP server over stdio
 *  mcp-cafe24 auth    → one-time login. Prints the authorize URL and opens it; you approve in the mall admin,
 *                       the browser lands on CAFE24_REDIRECT_URI with ?code=… (valid 1 minute). Then:
 *                         · https redirect (the normal case — Cafe24 only accepts https, no IPs): paste the
 *                           redirected URL (or just the code) back into this terminal;
 *                         · http://localhost:PORT/… redirect (local dev only): caught automatically.
 *                       Token is stored in ~/.config/kmcp/cafe24/<mall>.json.
 */
import http from "node:http";
import readline from "node:readline";
import { randomBytes } from "node:crypto";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Cafe24Auth, FileTokenStore } from "./auth.js";
import { writeGateFromEnv } from "@appmonster/approval";
import { createServer } from "./server.js";

const env = (k: string) => process.env[k]?.trim();
const mallId = env("CAFE24_MALL_ID");
const clientId = env("CAFE24_CLIENT_ID");
const clientSecret = env("CAFE24_CLIENT_SECRET");
if (!mallId || !clientId || !clientSecret) {
  console.error(
    "Missing CAFE24_MALL_ID / CAFE24_CLIENT_ID / CAFE24_CLIENT_SECRET.\n" +
      "Create an app at https://developers.cafe24.com → App 관리 → 개발 정보: Redirect URI must be https (any page you control, e.g. https://yourdomain.com/cafe24/callback), " +
      "권한: 상품·주문·게시판 읽기+쓰기, 상점 읽기. Put Client ID/Secret and CAFE24_REDIRECT_URI in your MCP client config env.",
  );
  process.exit(1);
}

/** Accepts a full redirected URL or a bare code. */
function extractCode(input: string, expectedState: string): string {
  const s = input.trim();
  if (!s) throw new Error("empty input");
  if (/^https?:\/\//.test(s)) {
    const u = new URL(s);
    const code = u.searchParams.get("code");
    const state = u.searchParams.get("state");
    if (!code) throw new Error("no ?code= in that URL");
    if (state && state !== expectedState) throw new Error("state mismatch — start `auth` again and use the newest URL");
    return code;
  }
  return s;
}

if (process.argv[2] === "auth") {
  const redirectUri = env("CAFE24_REDIRECT_URI") ?? "http://localhost:8787/callback";
  const store = new FileTokenStore(FileTokenStore.defaultPath(mallId));
  const auth = new Cafe24Auth({ mallId, clientId, clientSecret, redirectUri, store });
  const state = randomBytes(12).toString("hex");
  const url = auth.authorizeUrl(state);
  const openBrowser = () =>
    import("node:child_process").then(({ exec }) => exec(`${process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"} "${url}"`));
  const done = (t: { scopes?: string[] }) => {
    console.error(`✓ Token stored at ${FileTokenStore.defaultPath(mallId)} (scopes: ${t.scopes?.join(", ")})`);
    setTimeout(() => process.exit(0), 100);
  };

  const r = new URL(redirectUri);
  const isLocalHttp = r.protocol === "http:" && (r.hostname === "localhost" || r.hostname === "127.0.0.1");

  if (isLocalHttp) {
    const port = Number(r.port || 8787);
    const srv = http.createServer(async (req, res) => {
      const u = new URL(req.url ?? "/", redirectUri);
      if (u.pathname !== r.pathname) { res.statusCode = 404; res.end(); return; }
      if (u.searchParams.get("state") !== state) { res.statusCode = 400; res.end("state mismatch"); return; }
      const code = u.searchParams.get("code");
      if (!code) { res.statusCode = 400; res.end("missing code"); return; }
      try {
        const t = await auth.exchangeCode(code);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end("<h2>카페24 연결 완료 — 이 창을 닫아도 됩니다.</h2>");
        done(t);
      } catch (e) {
        res.statusCode = 500; res.end(String(e));
        console.error("✗", e);
        setTimeout(() => process.exit(1), 100);
      }
    });
    srv.listen(port, "127.0.0.1", () => {
      console.error(`Open this URL in your browser (logged in to the ${mallId} admin):\n\n  ${url}\n\nWaiting for the redirect on ${redirectUri} …`);
      void openBrowser();
    });
  } else {
    console.error(
      `Open this URL in your browser (logged in to the ${mallId} admin) and click 동의함:\n\n  ${url}\n\n` +
        `The browser will land on ${redirectUri}?code=… (a 404 page there is fine).\n` +
        `Paste that full URL — or just the code — here within 1 minute, then press Enter:`,
    );
    void openBrowser();
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    rl.question("> ", async (answer) => {
      rl.close();
      try {
        const t = await auth.exchangeCode(extractCode(answer, state));
        done(t);
      } catch (e) {
        console.error("✗", e instanceof Error ? e.message : e);
        process.exit(1);
      }
    });
  }
} else {
  const server = createServer({
    mallId, clientId, clientSecret,
    refreshToken: env("CAFE24_REFRESH_TOKEN"),
    apiVersion: env("CAFE24_API_VERSION"),
    shopNo: env("CAFE24_SHOP_NO") ? Number(env("CAFE24_SHOP_NO")) : undefined,
    writeGate: writeGateFromEnv(process.env, { source: "cafe24" }),
  });
  await server.connect(new StdioServerTransport());
}
