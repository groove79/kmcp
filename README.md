# K-MCP

Model Context Protocol servers for Korean platforms — so AI agents can actually *do things* in Korea: Smart Store, Cafe24, public data, Kakao notifications, and more.

한국 플랫폼용 MCP 서버 모음. 에이전트가 한국에서 일할 때 반드시 거치는 문.

| Package | Status | What |
| --- | --- | --- |
| [`@appmonster/mcp-naver-commerce`](packages/naver-commerce) | 0.1.0 | Naver Smart Store: products, stock, orders, inquiries |
| [`@appmonster/mcp-cafe24`](packages/cafe24) | 0.1.0 | Cafe24: products, variant stock, orders, board posts (OAuth, auto-refresh) |
| [`@appmonster/mcp-public-data`](packages/public-data) | 0.1.0 | 공공데이터: business status (NTS), holidays, road addresses, apartment trades |
| `@appmonster/mcp-hwp` | planned | HWP/HWPX → Markdown for agents |

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
