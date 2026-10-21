# Distribution checklist — where the server is listed and how

Published (2026-10-21): npm `@appmonster/*` 0.1.0 × 10 servers + `@appmonster/approval` · MCP Registry `io.github.groove79/*`.

## Toolkit blurb (for directories that list one entry per repo)

**Name:** K-MCP — Korean toolkit for AI agents

**One-liner (EN):** 10 MCP servers so agents can work in Korea: Naver Smart Store, Coupang, Cafe24, public data (business status, holidays, addresses), HWP files, KakaoTalk, Popbill e-tax invoices & 알림톡, Toss Payments, Japan→Korea sourcing, tax calendar — with human approval on every write.

**One-liner (KO):** AI 에이전트가 한국에서 일하기 위한 MCP 서버 10종 — 스마트스토어·쿠팡·카페24, 공공데이터, HWP, 카카오톡, 세금계산서·알림톡, 토스페이먼츠, 일본구매대행, 세무 일정. 쓰기는 전부 사람 승인.

**Tags:** mcp, korea, korean, e-commerce, smartstore, coupang, cafe24, hwp, kakao, tax-invoice, payments, agents

**Repo:** https://github.com/groove79/kmcp

**Zero-key servers to list first (instant try):** `@appmonster/mcp-hwp`, `@appmonster/mcp-kr-biz-calendar`


## Copy-paste blurb (use the same text everywhere)

**Name:** Naver Commerce (Smart Store)

**One-liner (EN):** Let Claude, Cursor or ChatGPT manage a Naver Smart Store: list products, read orders and customer inquiries, update stock — with human approval on writes.

**One-liner (KO):** 네이버 스마트스토어를 AI 에이전트가 직접 다룹니다 — 상품·주문·고객문의 조회, 재고 변경(쓰기는 승인 훅).

**Tags:** mcp, naver, smartstore, commerce, korea, e-commerce

**Repo:** https://github.com/groove79/kmcp · **npm:** https://www.npmjs.com/package/@appmonster/mcp-naver-commerce

**Install (Claude Desktop / Cursor):**
```json
{ "mcpServers": { "naver-commerce": { "command": "npx", "args": ["-y", "@appmonster/mcp-naver-commerce"],
  "env": { "NAVER_COMMERCE_CLIENT_ID": "…", "NAVER_COMMERCE_CLIENT_SECRET": "…" } } } }
```

## Automatic (nothing to do — verify after a few hours)

| Where | Check |
| --- | --- |
| GitHub MCP Registry | https://github.com/mcp — search "naver" |
| PulseMCP | https://www.pulsemcp.com/servers — search "naver" |
| VS Code MCP gallery | VS Code → Extensions → MCP Servers → search "naver" |
| MCP Harbor | mirrors official registry every 6h |

## Manual, one-time (owner account required)

| Where | How | Done |
| --- | --- | --- |
| Smithery | https://smithery.ai → sign in with GitHub (groove79) → Add server → paste repo URL → claim. Stdio is wrapped automatically. | ☐ |
| Glama | Auto-indexes public GitHub repos. Claim at https://glama.ai/mcp/servers → find the server → "Claim". Score items: LICENSE ✓, tests ✓, Dockerfile ✓, README ✓ | ☐ |
| mcp.so | https://mcp.so → Submit → repo URL + blurb above | ☐ |
| MCP Market | https://mcpmarket.com → Submit | ☐ |
| Cursor Directory | https://cursor.directory/mcp → Submit (needs `mcp.json` snippet above) | ☐ |
| awesome-mcp-servers | PR to https://github.com/punkpeye/awesome-mcp-servers under "E-commerce" | ☐ |

## Review directories (need the remote HTTPS + OAuth server — Stage 2)

- Claude Connectors Directory — https://claude.com/docs/connectors/building/submission
- ChatGPT Apps — https://developers.openai.com/apps-sdk/deploy/submission
- Claude plugin directory — bundle as plugin with `.mcp.json`

## Announce once (not repeatedly)

- GeekNews (https://news.hada.io) — "네이버 스마트스토어 MCP 서버 만들었습니다"
- 디스콰이엇 — same post, 1 time
- r/mcp — EN post with install snippet
- 페달코딩 영상 설명란에 repo 링크
