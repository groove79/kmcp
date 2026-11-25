## 🐤 K-MCP canary — 2026-11-25 12:20 KST (live)

✅ OK 19 · 🟡 DRIFT 4 · 🔴 BREAK 0 · 🔑 AUTH 4 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 20 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 23 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 766 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 91 |  |
| `public-data.holidays` | ✅ OK | 588 |  |
| `public-data.searchAddress` | ✅ OK | 118 |  |
| `public-data.aptTrades` | ✅ OK | 93 |  |
| `cafe24.listProducts` | ✅ OK | 2404 |  |
| `cafe24.getProduct` | ✅ OK | 894 |  |
| `cafe24.listOrders` | ✅ OK | 170 |  |
| `cafe24.listBoards` | ✅ OK | 482 |  |
| `cafe24.updateInventory` | ✅ OK | 2618 |  |
| `naver-commerce.listProducts` | ✅ OK | 202 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 249 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | 🟡 DRIFT | 239 | removed timestamp, traceId · added changed, changed.lastChangeStatuses, changed.lastChangeStatuses[], changed.lastChangeStatuses[].orderId, changed.lastChangeSt |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 109 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2898 |  |
| `kakao.me` | 🔑 AUTH | 77 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `kakao.sendToMe` | 🔑 AUTH | 72 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `toss-payments.listSettlements` | ✅ OK | 379 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20006 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 83 |  |
| `delivery.listCarriers` | 🔑 AUTH | 83 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 39 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1386 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 70 |  |
