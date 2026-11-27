## 🐤 K-MCP canary — 2026-11-27 11:37 KST (live)

✅ OK 21 · 🟡 DRIFT 2 · 🔴 BREAK 0 · 🔑 AUTH 4 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 23 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 22 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 1210 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 152 |  |
| `public-data.holidays` | ✅ OK | 551 |  |
| `public-data.searchAddress` | ✅ OK | 122 |  |
| `public-data.aptTrades` | ✅ OK | 175 |  |
| `cafe24.listProducts` | ✅ OK | 3262 |  |
| `cafe24.getProduct` | ✅ OK | 1047 |  |
| `cafe24.listOrders` | ✅ OK | 254 |  |
| `cafe24.listBoards` | ✅ OK | 472 |  |
| `cafe24.updateInventory` | ✅ OK | 2984 |  |
| `naver-commerce.listProducts` | ✅ OK | 361 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 336 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 151 |  |
| `naver-commerce.listInquiries` | ✅ OK | 125 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 3026 |  |
| `kakao.me` | 🔑 AUTH | 91 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `kakao.sendToMe` | 🔑 AUTH | 94 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `toss-payments.listSettlements` | ✅ OK | 419 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20066 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 163 |  |
| `delivery.listCarriers` | 🔑 AUTH | 131 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 130 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1573 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 88 |  |
