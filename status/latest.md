## 🐤 K-MCP canary — 2026-11-21 10:04 KST (live)

✅ OK 20 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 4 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 58 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 31 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 821 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 85 |  |
| `public-data.holidays` | ✅ OK | 1103 |  |
| `public-data.searchAddress` | ✅ OK | 123 |  |
| `public-data.aptTrades` | ✅ OK | 108 |  |
| `cafe24.listProducts` | ✅ OK | 2250 |  |
| `cafe24.getProduct` | ✅ OK | 777 |  |
| `cafe24.listOrders` | ✅ OK | 169 |  |
| `cafe24.listBoards` | ✅ OK | 347 |  |
| `cafe24.updateInventory` | ✅ OK | 2671 |  |
| `naver-commerce.listProducts` | ✅ OK | 222 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 281 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 122 |  |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 97 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2886 |  |
| `kakao.me` | 🔑 AUTH | 71 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `kakao.sendToMe` | 🔑 AUTH | 70 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `toss-payments.listSettlements` | ✅ OK | 398 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20005 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 98 |  |
| `delivery.listCarriers` | 🔑 AUTH | 49 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 30 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 956 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 65 |  |
