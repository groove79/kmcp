# @appmonster/mcp-cafe24

MCP server for the **Cafe24 Admin API**. Lets Claude, Cursor or ChatGPT manage a Cafe24 mall: list and edit products, set variant stock, read orders, post board articles — with human approval on writes.

카페24 쇼핑몰 MCP 서버. 에이전트가 상품·재고·주문·게시판을 직접 다룹니다.

## Setup (one time)

1. Create an app at [Cafe24 Developers](https://developers.cafe24.com) → 앱 만들기.
   - Redirect URI: `http://localhost:8787/callback`
   - Scopes: 상품 읽기/쓰기, 주문 읽기/쓰기, 게시판 읽기/쓰기, 쇼핑몰 정보 읽기
   - Note the **client id** and **client secret**; your **mall id** is the subdomain of your admin (`{mall_id}.cafe24.com`).
2. Authorize once (opens the browser, stores a token in `~/.config/kmcp/cafe24/<mall_id>.json`):
   ```bash
   CAFE24_MALL_ID=yourmall CAFE24_CLIENT_ID=... CAFE24_CLIENT_SECRET=... npx -y @appmonster/mcp-cafe24 auth
   ```
   The refresh token rotates automatically and lasts 2 weeks; if the server goes unused longer than that, run `auth` again.

## Install

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cafe24": {
      "command": "npx",
      "args": ["-y", "@appmonster/mcp-cafe24"],
      "env": {
        "CAFE24_MALL_ID": "yourmall",
        "CAFE24_CLIENT_ID": "your-client-id",
        "CAFE24_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Optional env: `CAFE24_REFRESH_TOKEN` (seed a token without the browser step), `CAFE24_API_VERSION` (default `2026-06-01`), `CAFE24_SHOP_NO` (default 1), `CAFE24_REDIRECT_URI`.

## Tools

| Tool | Access | What it does |
| --- | --- | --- |
| `cafe24_list_products` | read | `GET /admin/products` with name/display/selling filters |
| `cafe24_get_product` | read | Product detail + variants (option codes, stock) |
| `cafe24_update_product` | **write** | Name, price, display, selling — only fields you pass |
| `cafe24_update_inventory` | **write** | Set a variant's stock (`PUT …/variants/{code}/inventories`) |
| `cafe24_list_orders` | read | Orders in a date range with items, buyer, receivers |
| `cafe24_list_boards` | read | Boards and their numbers |
| `cafe24_create_article` | **write** | Post to a board (notice, blog, Q&A answer) |

Write tools carry `destructiveHint: true` and honour an `approveWrite` hook.

## Example prompts

- "이번 주 신규 주문 몇 건이야? 미발송 건만 보여줘"
- "'전동 드릴' 상품 가격을 89,000원으로 바꿔줘"
- "공지사항 게시판에 추석 배송 안내 올려줘"

MIT © Appmonster
