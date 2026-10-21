# K-MCP

Model Context Protocol servers for Korean platforms — so AI agents can actually *do things* in Korea: Smart Store, Cafe24, public data, Kakao notifications, and more.

한국 플랫폼용 MCP 서버 모음. 에이전트가 한국에서 일할 때 반드시 거치는 문.

| Package | Status | What |
| --- | --- | --- |
| [`@appmonster/mcp-naver-commerce`](packages/naver-commerce) | 0.1.0 | Naver Smart Store: products, stock, orders, inquiries |
| [`@appmonster/mcp-cafe24`](packages/cafe24) | 0.1.0 | Cafe24: products, variant stock, orders, board posts (OAuth, auto-refresh) |
| [`@appmonster/mcp-public-data`](packages/public-data) | 0.1.0 | 공공데이터: business status (NTS), holidays, road addresses, apartment trades |
| [`@appmonster/mcp-hwp`](packages/hwp) | 0.1.0 | HWP/HWPX (한글) → Markdown + tables as JSON, no keys |
| [`@appmonster/mcp-coupang`](packages/coupang) | 0.1.0 | Coupang Wing: products, item stock/price, order sheets, ship confirmation (HMAC) |
| [`@appmonster/mcp-kakao`](packages/kakao) | 0.1.0 | KakaoTalk messages: send to self/friends, friends list (OAuth, auto-refresh) |
| [`@appmonster/mcp-toss-payments`](packages/toss-payments) | 0.1.0 | Toss Payments: payment lookup, cancel/refund (approval-gated), transactions, settlements |
| [`@appmonster/mcp-popbill`](packages/popbill) | 0.1.0 | Popbill: e-tax invoices (issue/cancel/search), Hometax sync, KakaoTalk 알림톡 |
| [`@appmonster/mcp-japan-bridge`](packages/japan-bridge) | 0.1.0 | Japan → Korea sourcing: Rakuten/Yahoo search, landed cost + price calc, Smart Store draft |
| [`@appmonster/mcp-kr-biz-calendar`](packages/kr-biz-calendar) | 0.1.0 | Tax/payroll deadlines, public holidays, business-day math — no keys |

## Quick start

```bash
pnpm install
pnpm build
pnpm test
```

Each package has its own README with install snippets for Claude Desktop, Cursor and Claude Code.

## Principles

- **One tool = one verb.** Names are `platform_verb_object`; descriptions say when to use it and what it needs, in English then Korean.
- **Read/write is explicit.** Write tools are annotated `destructiveHint` and accept an `approveWrite` hook.
- **Your credentials stay yours.** Env vars only; the server talks to the platform and nothing else.

MIT © Appmonster
