# @appmonster/mcp-coupang

MCP server for the **Coupang Wing Open API** (쿠팡 판매자). Lets an AI agent read products and orders, change item stock/price, and acknowledge paid orders — with every write optionally gated by a human approval ([OK Agent](https://github.com/groove79/okagent)).

쿠팡 윙 오픈API용 MCP 서버. 상품·발주서 조회, 옵션 재고/가격 변경, 상품준비중 처리.

## Tools

| Tool | Access | What it does |
|---|---|---|
| `coupang_list_products` | read | 등록 상품 목록 (이름/상태 필터, nextToken 페이징) |
| `coupang_get_product` | read | 상품 상세 + 옵션(`vendorItemId`, 가격, 출고일) |
| `coupang_update_item_quantity` | **write** | 옵션 재고 수량 변경 (0 = 품절) |
| `coupang_update_item_price` | **write** | 옵션 판매가 변경 |
| `coupang_list_orders` | read | 기간·상태별 발주서 (ACCEPT/INSTRUCT/DEPARTURE/…), 최대 31일 |
| `coupang_get_order` | read | 발주서 단건 — 배송 직전 주소 재확인용 |
| `coupang_confirm_orders` | **write** | 결제완료 → 상품준비중 (최대 50건, 건별 결과) |

## Setup

1. Wing → 판매자정보 → 추가판매정보 → **OPEN API 키 발급**. Access key, Secret key, 그리고 업체코드(`A00012345` 형태)를 받습니다.
2. MCP client config:

```json
{
  "mcpServers": {
    "coupang": {
      "command": "npx",
      "args": ["-y", "@appmonster/mcp-coupang"],
      "env": {
        "COUPANG_ACCESS_KEY": "…",
        "COUPANG_SECRET_KEY": "…",
        "COUPANG_VENDOR_ID": "A00012345"
      }
    }
  }
}
```

### Human approval for writes (optional, recommended)

Add `APPROVAL_URL` and `APPROVAL_API_KEY` from your OK Agent deployment. Every write tool then creates an approval request and only runs after you tap **승인** on your phone.

```json
"APPROVAL_URL": "https://okagent.kr",
"APPROVAL_API_KEY": "ok_…",
"APPROVAL_TIMEOUT_SEC": "300"
```

## Notes

- Auth is Coupang's CEA HMAC-SHA256 header; the server signs the exact bytes it sends (query string included), so no clock-skew tricks are needed beyond a correct system clock (UTC).
- Coupang returns HTTP 200 with `code: "ERROR"` for many business failures — those surface as tool errors with Coupang's message.
- Order date range is limited to 31 days per call; `coupang_list_orders` defaults to the last 7 days (KST).
- Customers can change the delivery address after paying. Call `coupang_get_order` right before printing a label.

## Development

```bash
pnpm --filter @appmonster/mcp-coupang test
```

Tests use an injected `fetch`; no real network.
