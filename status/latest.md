## 🐤 K-MCP canary — 2026-11-28 11:24 KST (live)

✅ OK 20 · 🟡 DRIFT 2 · 🔴 BREAK 1 · 🔑 AUTH 4 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 24 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 23 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 1443 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 77 |  |
| `public-data.holidays` | ✅ OK | 411 |  |
| `public-data.searchAddress` | ✅ OK | 102 |  |
| `public-data.aptTrades` | 🔴 BREAK | 554 | Cannot read properties of undefined (reading 'body') |
| `cafe24.listProducts` | ✅ OK | 3236 |  |
| `cafe24.getProduct` | ✅ OK | 807 |  |
| `cafe24.listOrders` | ✅ OK | 311 |  |
| `cafe24.listBoards` | ✅ OK | 438 |  |
| `cafe24.updateInventory` | ✅ OK | 2808 |  |
| `naver-commerce.listProducts` | ✅ OK | 209 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 244 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 85 |  |
| `naver-commerce.listInquiries` | ✅ OK | 89 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2679 |  |
| `kakao.me` | 🔑 AUTH | 74 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `kakao.sendToMe` | 🔑 AUTH | 71 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `toss-payments.listSettlements` | ✅ OK | 248 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20008 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 99 |  |
| `delivery.listCarriers` | 🔑 AUTH | 51 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 43 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 981 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 80 |  |
