# @kmcp/naver-commerce

MCP server for the **Naver Commerce API** (Smart Store). Lets Claude, Cursor, ChatGPT and any MCP client list products, read orders, answer "any new orders?", and change stock — in Korean or English.

네이버 커머스 API(스마트스토어)용 MCP 서버. 에이전트가 상품·재고·주문·고객문의를 직접 다룹니다.

## Install

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "naver-commerce": {
      "command": "npx",
      "args": ["-y", "@kmcp/naver-commerce"],
      "env": {
        "NAVER_COMMERCE_CLIENT_ID": "your-client-id",
        "NAVER_COMMERCE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`) — same block under `"mcpServers"`.

**Claude Code**:

```bash
claude mcp add naver-commerce -e NAVER_COMMERCE_CLIENT_ID=... -e NAVER_COMMERCE_CLIENT_SECRET=... -- npx -y @kmcp/naver-commerce
```

Get credentials at [커머스API센터](https://apicenter.commerce.naver.com) → 애플리케이션 등록. The secret is used as a bcrypt salt and never leaves your machine.

## Tools

| Tool | Access | What it does |
| --- | --- | --- |
| `naver_list_products` | read | List products with paging/filters (`POST /v1/products/search`) |
| `naver_get_product` | read | Channel product detail incl. options and stock (`GET /v2/products/channel-products/{no}`) |
| `naver_update_stock` | **write** | Change stock. No-option product: GET channel product → change `stockQuantity` → `PUT /v2/products/channel-products/{no}` whole (Naver has no stock-only API). Option product: `PUT …/option-stock` |
| `naver_list_orders` | read | Orders changed since a time, with details (`last-changed-statuses` → `query`) |
| `naver_list_inquiries` | read | Customer 1:1 inquiries in a date range (`GET /v1/pay-user/inquiries`) |

Write tools carry `destructiveHint: true` so clients can ask before running them. `createServer({ approveWrite })` lets you plug in an external approval step.

## Example prompts

- "어제 이후 새로 결제된 주문 보여줘"
- "'모자' 상품 재고를 0으로 바꿔줘" (asks first — it's a write)
- "답변 안 한 고객문의 있어?"

## Security

- Credentials come only from env vars; nothing is stored or sent anywhere except `api.commerce.naver.com`.
- Tokens are cached in memory and refreshed 60s before expiry.
- Errors return Naver's `code`/`message` verbatim so the agent can explain what went wrong.

## Develop

```bash
pnpm install && pnpm -F @kmcp/naver-commerce build && pnpm -F @kmcp/naver-commerce test
```

MIT © Appmonster
