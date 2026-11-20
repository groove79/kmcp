## 🐤 K-MCP canary — 2026-11-20 10:34 KST (live)

✅ OK 21 · 🟡 DRIFT 4 · 🔴 BREAK 0 · 🔑 AUTH 2 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 22 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 21 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 821 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 159 |  |
| `public-data.holidays` | ✅ OK | 404 |  |
| `public-data.searchAddress` | ✅ OK | 111 |  |
| `public-data.aptTrades` | ✅ OK | 116 |  |
| `cafe24.listProducts` | ✅ OK | 2670 |  |
| `cafe24.getProduct` | ✅ OK | 964 |  |
| `cafe24.listOrders` | ✅ OK | 157 |  |
| `cafe24.listBoards` | ✅ OK | 398 |  |
| `cafe24.updateInventory` | ✅ OK | 2644 |  |
| `naver-commerce.listProducts` | ✅ OK | 258 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 281 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | 🟡 DRIFT | 218 | removed timestamp, traceId · added changed, changed.lastChangeStatuses, changed.lastChangeStatuses[], changed.lastChangeStatuses[].orderId, changed.lastChangeSt |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 58 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2796 |  |
| `kakao.me` | ✅ OK | 408 |  |
| `kakao.sendToMe` | ✅ OK | 157 |  |
| `toss-payments.listSettlements` | ✅ OK | 238 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20005 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 96 |  |
| `delivery.listCarriers` | 🔑 AUTH | 46 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 34 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1058 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 66 |  |
