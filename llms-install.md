# K-MCP — installation guide for AI agents

You are an AI agent (Cline, Claude Code, Cursor, Windsurf, Codex…) asked to install K-MCP for a user. Follow these steps in order. Ask the user only for the keys of the platforms they actually want.

## Option A — no install: remote server (recommended for read-only use)

Add a Streamable HTTP MCP server with this URL. No API key is needed for the read-only tools (holidays, business days, tax deadlines, HWP reading, 사업자 status, address search, apartment prices, parcel tracking, JPY rate, import duty).

```
https://okagent.kr/api/mcp
```

- Claude Code: `claude mcp add --transport http kmcp https://okagent.kr/api/mcp`
- Cursor / Windsurf / Cline (`mcp.json` / `cline_mcp_settings.json`): `{"mcpServers": {"kmcp": {"url": "https://okagent.kr/api/mcp"}}}`
- Claude (claude.ai / Desktop): Settings → Connectors → Add custom connector → paste the URL.
- ChatGPT: Settings → Apps & Connectors → Developer mode → Create connector → paste the URL (no auth).

Limits: 100 calls/day per IP without a key. For more, the user creates a free key at https://okagent.kr/dashboard and you send `Authorization: Bearer ok_…` (1,000/day; Pro 20,000/day).
HWP files must be passed as `url` or `base64` on the remote server (no local paths).

## Option B — local servers (npx, Node.js ≥ 20)

Check `node --version` first; install Node.js 20+ if missing. Every server runs with `npx -y <package>`; nothing else to download.

### 1. Keyless servers — install these first, they work immediately

| Server | Package | Add (Claude Code) |
|---|---|---|
| Korean business calendar | `@appmonster/mcp-kr-biz-calendar` | `claude mcp add kr-biz-calendar -- npx -y @appmonster/mcp-kr-biz-calendar` |
| HWP / HWPX reader | `@appmonster/mcp-hwp` | `claude mcp add hwp -- npx -y @appmonster/mcp-hwp` |
| Japan bridge (FX, landed cost) | `@appmonster/mcp-japan-bridge` | `claude mcp add japan-bridge -- npx -y @appmonster/mcp-japan-bridge` |

Generic JSON config (Claude Desktop `claude_desktop_config.json`, Cursor `.cursor/mcp.json`, Cline settings):

```json
{
  "mcpServers": {
    "kr-biz-calendar": { "command": "npx", "args": ["-y", "@appmonster/mcp-kr-biz-calendar"] },
    "hwp": { "command": "npx", "args": ["-y", "@appmonster/mcp-hwp"] }
  }
}
```

### 2. Servers that need the user's keys — add only what the user asked for

Put keys in the server's `env` block. Never print the user's secrets back in chat.

| Server | Package | Required env | Where the user gets it |
|---|---|---|---|
| Public data | `@appmonster/mcp-public-data` | `DATA_GO_KR_KEY` (+ `JUSO_KEY` for addresses) | data.go.kr (free, apply per API) · business.juso.go.kr |
| Parcel tracking | `@appmonster/mcp-delivery` | `DELIVERY_TRACKER_CLIENT_ID`, `DELIVERY_TRACKER_CLIENT_SECRET` | console.tracker.delivery (free plan) |
| Japan search (optional) | `@appmonster/mcp-japan-bridge` | `RAKUTEN_APP_ID`, `RAKUTEN_ACCESS_KEY` or `YAHOO_JP_APP_ID` | Rakuten / Yahoo! Japan developer sites |
| Naver Smart Store | `@appmonster/mcp-naver-commerce` | `NAVER_COMMERCE_CLIENT_ID`, `NAVER_COMMERCE_CLIENT_SECRET` | apicenter.commerce.naver.com |
| Coupang Wing | `@appmonster/mcp-coupang` | `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`, `COUPANG_VENDOR_ID` | Wing → 판매자 정보 → OPEN API 키 |
| Cafe24 | `@appmonster/mcp-cafe24` | `CAFE24_MALL_ID`, `CAFE24_CLIENT_ID`, `CAFE24_CLIENT_SECRET` (then run `npx -y @appmonster/mcp-cafe24 auth` once) | developers.cafe24.com |
| Toss Payments | `@appmonster/mcp-toss-payments` | `TOSS_SECRET_KEY` | 토스페이먼츠 개발자센터 |
| Popbill | `@appmonster/mcp-popbill` | `POPBILL_LINK_ID`, `POPBILL_SECRET_KEY`, `POPBILL_CORP_NUM` (`POPBILL_TEST=true` for sandbox) | popbill.com 연동 신청 |
| KakaoTalk | `@appmonster/mcp-kakao` | `KAKAO_REST_API_KEY` (then run `npx -y @appmonster/mcp-kakao auth` once) | developers.kakao.com |

Each package README (`packages/<name>/README.md`) lists every variable and the exact console steps.

### 3. Write tools are gated — set this up for commerce servers

Write tools (stock/price changes, order confirmation, refunds, tax invoices, messages) never run on the first call:

- Default `confirm` mode: the first call returns a preview and a one-time `confirm_token`. Show the preview to the user; re-call with `confirm_token` only after the user agrees.
- `OKAGENT_API_KEY=ok_…` (free at https://okagent.kr): the request goes to the user's KakaoTalk for a one-tap approval instead.
- `KMCP_WRITE_MODE=direct` disables the gate — only for scripts the user fully trusts.

## Verify

Restart the client, then call `kr_is_business_day` with no arguments (keyless) and confirm a result comes back. For a keyed server, call its read tool first (e.g. `naver_list_products`).

## Help

- Korean guides: https://okagent.kr/guide · server pages: https://okagent.kr/mcp
- Missing platform? Open https://github.com/groove79/kmcp/issues/new?template=server-request.yml
