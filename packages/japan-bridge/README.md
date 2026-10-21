# @appmonster/mcp-japan-bridge

MCP server that turns an agent into a **일본구매대행 sourcing assistant**: search Japanese marketplaces, compute the real Korea landed cost and a selling price, and draft the Smart Store listing — including the disclosures Korean consumer law requires for overseas buying-agent sales.

Built from running an actual Japan buying-agent store on Naver Smart Store. Pair it with `@appmonster/mcp-naver-commerce` (post the draft) or `@appmonster/mcp-coupang`.

## Tools

| Tool | What it does |
|---|---|
| `jp_search_rakuten` | 楽天市場 keyword search — price, shop, image, reviews, stock, 送料 flag |
| `jp_search_yahoo` | Yahoo! JAPAN Shopping search — same shape, 1 req/sec |
| `jp_fx_rate` | JPY→KRW, USD→KRW mid-market rates (no key) |
| `jp_landed_cost` | Full landed cost + suggested price: FX → forwarder shipping → customs (USD 150 목록통관, 간이세율 20% or 관세+부가세) → marketplace fee → target margin. Every step explained |
| `jp_listing_draft` | Naver `originProduct` draft with origin 일본, lead time, 개인통관고유부호 / 관부가세 / 반품 제한 notices, and a pre-publish checklist |

All tools are read-only; nothing is posted anywhere.

## Example flow (agent)

1. `jp_search_rakuten {keyword: "ポケモン ぬいぐるみ", sort: "-reviewCount"}`
2. `jp_fx_rate`
3. `jp_landed_cost {priceJpy: 2980, weightKg: 0.4, jpyToKrw: 9.1, usdToKrw: 1380, targetMarginRate: 0.25}`
   → `landedCostKrw 47,000 · dutyFree true · suggestedPriceKrw 68,200 · marginKrw 17,100`
4. Agent writes the Korean title/description → `jp_listing_draft` → review → `naver_create_product` (naver-commerce server, coming) or paste into 스마트스토어센터.

## Setup

```json
{
  "mcpServers": {
    "japan-bridge": {
      "command": "npx",
      "args": ["-y", "@appmonster/mcp-japan-bridge"],
      "env": {
        "RAKUTEN_APP_ID": "…",         "RAKUTEN_ACCESS_KEY": "…",
        "YAHOO_JP_APP_ID": "…",
        "BRIDGE_SHIPPING_BASE_JPY": "700",
        "BRIDGE_SHIPPING_PER_KG_JPY": "1500",
        "BRIDGE_PLATFORM_FEE_RATE": "0.06"
      }
    }
  }
}
```

- Rakuten: free app at https://webservice.rakuten.co.jp (app id + access key).
- Yahoo! JAPAN: free Client ID at https://e.developer.yahoo.co.jp.
- `BRIDGE_SHIPPING_*`: your forwarder's (배대지) tariff. The defaults are rough placeholders — set yours.
- `BRIDGE_PLATFORM_FEE_RATE`: Smart Store commission + PG ≈ 5.5–6.5% depending on channel; Coupang is higher.

## Customs rules encoded (adjust via inputs)

- 소액면세: goods value ≤ USD 150 per shipment → no duty/VAT (목록통관). `dutyFreeUsd` adjustable.
- Above: `simple` mode applies 간이세율 (default 20%) on 과세가격 = goods + shipping; `general` mode applies HS-code `dutyRate` then 10% VAT on (과세가격 + duty).
- The tool warns about 합산과세 when splitting quantities.

These are estimates for pricing decisions; customs uses its own weekly exchange rate and final classification.

## Development

```bash
pnpm --filter @appmonster/mcp-japan-bridge test
```
