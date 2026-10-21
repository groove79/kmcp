# K-MCP — the Korean toolkit for AI agents

**Everything an AI agent needs to actually get work done in Korea**, as MCP servers: sell on Smart Store, Coupang and Cafe24; verify a business number; read a 한글 (.hwp) file; issue a tax invoice; send a KakaoTalk notice; know that 1/25 is a Sunday so VAT is due 1/26 — and ask a human before spending money.

한국에서 일하는 AI 에이전트의 필수 도구 모음. 스마트스토어·쿠팡·카페24 운영, 사업자 검증, HWP 읽기, 세금계산서, 카카오톡 알림, 세무 일정, 그리고 돈이 나가기 전 사람 승인.

Works with Claude Desktop, Claude Code, Cursor, Windsurf, n8n, and anything that speaks MCP over stdio. Every server is on npm and the [official MCP Registry](https://registry.modelcontextprotocol.io) under `io.github.groove79/*`.

## Servers

| Server | Install name | What the agent can do |
|---|---|---|
| 🛒 **Naver Smart Store** | `@appmonster/mcp-naver-commerce` | list/get products, **update stock**, **create product** (+ image upload), orders, customer inquiries |
| 🛒 **Coupang Wing** | `@appmonster/mcp-coupang` | products, **item stock/price**, order sheets, **ship confirmation** |
| 🛒 **Cafe24** | `@appmonster/mcp-cafe24` | products, **variant stock**, orders, board posts (OAuth auto-refresh) |
| 🏛 **Public data** | `@appmonster/mcp-public-data` | 사업자 상태(국세청), 공휴일(천문연), 도로명주소, 아파트 실거래가 |
| 📄 **HWP** | `@appmonster/mcp-hwp` | .hwp / .hwpx → Markdown + tables as JSON — own parser, no keys |
| 💬 **KakaoTalk** | `@appmonster/mcp-kakao` | send to self / friends, friends list (Kakao Developers API) |
| 🧾 **Popbill** | `@appmonster/mcp-popbill` | **e-tax invoices** issue/cancel/search, Hometax sync, **알림톡** |
| 💳 **Toss Payments** | `@appmonster/mcp-toss-payments` | payment lookup, **cancel/refund**, transactions, settlements |
| 🇯🇵 **Japan bridge** | `@appmonster/mcp-japan-bridge` | Rakuten/Yahoo! search → landed cost & price → Smart Store draft |
| 📅 **Biz calendar** | `@appmonster/mcp-kr-biz-calendar` | tax/payroll deadlines, holidays, business-day math — no keys, offline |
| ✅ **Approval** (library) | `@appmonster/approval` | the `approveWrite` hook every server above uses → [OK Agent](https://github.com/yumi-kim-79/okagent) |

**Bold** = write tools. They are annotated `destructiveHint`, and when `APPROVAL_URL` is set they wait for a human tap on the phone before running.

## 30-second install

Claude Desktop / Cursor / Windsurf — add to your MCP config:

```json
{
  "mcpServers": {
    "kr-biz-calendar": { "command": "npx", "args": ["-y", "@appmonster/mcp-kr-biz-calendar"] },
    "hwp":             { "command": "npx", "args": ["-y", "@appmonster/mcp-hwp"] },
    "naver-commerce":  { "command": "npx", "args": ["-y", "@appmonster/mcp-naver-commerce"],
                         "env": { "NAVER_COMMERCE_CLIENT_ID": "…", "NAVER_COMMERCE_CLIENT_SECRET": "…" } }
  }
}
```

Claude Code:

```bash
claude mcp add kr-biz-calendar -- npx -y @appmonster/mcp-kr-biz-calendar
claude mcp add hwp -- npx -y @appmonster/mcp-hwp
```

The first two need no keys. Each package README has the exact env vars and where to get them (most are free, 5 minutes).

## What becomes possible — prompts that only work with these together

- **"어제 결제된 쿠팡 주문 전부 상품준비중 처리하고, 재고 5개 이하인 옵션은 스마트스토어에서도 품절 처리해줘."**
  → `coupang_list_orders` → `coupang_confirm_orders` *(approval)* → `naver_update_stock` *(approval)*
- **"이 거래처 사업자번호 확인하고 문제 없으면 이번 달 납품분 세금계산서 발행해."**
  → `kr_check_business` → `popbill_issue_taxinvoice` *(approval)*
- **"첨부한 공문(.hwp)에서 표를 뽑아서 수량·단가 합계 내고, 담당자에게 카톡으로 요약 보내줘."**
  → `hwp_extract_tables` → `kakao_send_to_me`
- **"라쿠텐에서 이 상품 찾아서 한국 판매가 계산하고 스마트스토어 등록 초안 만들어."**
  → `jp_search_rakuten` → `jp_fx_rate` → `jp_landed_cost` → `jp_listing_draft` → `naver_upload_images` → `naver_create_product` *(approval)*
- **"이번 달 우리 법인이 신고할 거 뭐 있고, 각각 영업일 기준 며칠 남았어?"**
  → `kr_tax_calendar` → `kr_add_business_days`
- **"Shopify 재고를 스마트스토어에도 똑같이 맞춰줘."**
  → Shopify's official MCP + `naver_update_stock` — K-MCP is built to sit next to the servers you already use.

## Human-in-the-loop by default

Money and irreversible actions (refunds, stock changes, invoices, 알림톡) go through [`@appmonster/approval`](packages/approval): the server creates a request, the owner gets a link (web, KakaoTalk, Slack), taps **승인**, and only then does the tool run. No app install, no account for the approver. Set two env vars on any server:

```json
"APPROVAL_URL": "https://okagent.vercel.app", "APPROVAL_API_KEY": "ok_…"
```

## Principles

- **One tool = one verb.** `platform_verb_object`; descriptions say when to use it and what it needs, English first then Korean, so any model picks the right tool from the description alone.
- **Read/write is explicit.** `readOnlyHint` / `destructiveHint` on every tool; writes accept `approveWrite`.
- **Your credentials stay yours.** Env vars only; each server talks to its platform and nothing else. Nothing is proxied through us.
- **Tested without the network.** Every package ships with `node:test` suites that inject `fetch`; CI builds and tests on every push, publishes with npm provenance.
- **Honest about limits.** Test keys are tagged in tool descriptions; estimates (customs, FX) say so; nothing is auto-posted.

## Roadmap

- Hosted gateway (Streamable HTTP, API keys, fixed IP for Naver/11st whitelists) → Claude.ai connectors, ChatGPT apps, n8n cloud — see [docs/GATEWAY.md](docs/GATEWAY.md)
- 11번가·ESM, 아임웹 (app-store model, needs the gateway)
- Korea customs: HS code & duty-rate lookup, 세관장확인 요건

## Development

```bash
pnpm install && pnpm build && pnpm test   # 11 packages, ~65 tests, no network
```

See [AGENTS.md](AGENTS.md) for conventions, [RELEASING.md](RELEASING.md) for the tag → npm → registry pipeline, [SECURITY.md](SECURITY.md) for reporting.

MIT © [Appmonster](https://appmonster.co.kr) — built by a solo developer who runs a Smart Store, exports solar lighting, and got tired of agents that stop at the Korean border.
