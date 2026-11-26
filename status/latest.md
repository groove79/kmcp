## 🐤 K-MCP canary — 2026-11-26 11:37 KST (live)

✅ OK 21 · 🟡 DRIFT 2 · 🔴 BREAK 0 · 🔑 AUTH 4 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 21 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 23 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 877 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 74 |  |
| `public-data.holidays` | ✅ OK | 378 |  |
| `public-data.searchAddress` | ✅ OK | 106 |  |
| `public-data.aptTrades` | ✅ OK | 78 |  |
| `cafe24.listProducts` | ✅ OK | 4014 |  |
| `cafe24.getProduct` | ✅ OK | 915 |  |
| `cafe24.listOrders` | ✅ OK | 191 |  |
| `cafe24.listBoards` | ✅ OK | 393 |  |
| `cafe24.updateInventory` | ✅ OK | 2897 |  |
| `naver-commerce.listProducts` | ✅ OK | 232 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 229 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 124 |  |
| `naver-commerce.listInquiries` | ✅ OK | 127 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2887 |  |
| `kakao.me` | 🔑 AUTH | 71 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `kakao.sendToMe` | 🔑 AUTH | 72 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `toss-payments.listSettlements` | ✅ OK | 386 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20039 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 251 |  |
| `delivery.listCarriers` | 🔑 AUTH | 51 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 40 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 852 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 58 |  |
