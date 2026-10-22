# @appmonster/mcp-toss-payments

MCP server for **Toss Payments** (토스페이먼츠) core API. An agent can look up a payment, reconcile transactions, read settlements — and cancel/refund, which is the one tool that moves real money and is built to run behind a human approval ([OK Agent](https://github.com/groove79/okagent)).

토스페이먼츠 MCP 서버 — 결제 조회, 거래 내역, 정산, 취소/환불(승인 게이트).

## Tools

| Tool | Access | What it does |
|---|---|---|
| `toss_get_payment` | read | paymentKey 또는 orderId로 결제 1건: 상태, 금액, 잔액, 수단, 취소 이력, 영수증 URL |
| `toss_cancel_payment` | **write** | 전체/부분 취소. 가상계좌는 환불계좌 필수. Idempotency-Key 자동 부여 |
| `toss_list_transactions` | read | 기간별 거래(승인·취소) 목록, 최대 5000건, startingAfter 커서 |
| `toss_list_settlements` | read | 정산 내역(수수료·부가세·지급액), 매출일/지급일 기준, 합계 포함 |

## Setup

1. https://developers.tosspayments.com → 내 개발정보 → **API 키**. 먼저 `test_sk_…`로 시작하세요 (테스트 결제 데이터로 동작).
2. MCP client config:

```json
{
  "mcpServers": {
    "toss-payments": {
      "command": "npx",
      "args": ["-y", "@appmonster/mcp-toss-payments"],
      "env": { "TOSS_SECRET_KEY": "test_sk_…" }
    }
  }
}
```

### Human approval for cancels (strongly recommended with a live key)

```json
"APPROVAL_URL": "https://okagent.kr",
"APPROVAL_API_KEY": "ok_…"
```

With a `live_sk_` key the server prints a warning at start if no approval hook is configured.

## Safety notes

- `toss_cancel_payment` is irreversible. The tool description tells the agent to call `toss_get_payment` first and check `balanceAmount`.
- Every cancel carries an `Idempotency-Key` (UUID, or the caller's own key) so a retried call cannot refund twice. Keys are valid 15 days on Toss's side.
- Test-key servers tag every tool description with `[TEST KEY — sandbox data]` so the agent never mistakes sandbox numbers for real revenue.

## Development

```bash
pnpm --filter @appmonster/mcp-toss-payments test
```
