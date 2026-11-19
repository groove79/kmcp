## 🐤 K-MCP canary — 2026-11-19 10:37 KST (live)

✅ OK 21 · 🟡 DRIFT 4 · 🔴 BREAK 0 · 🔑 AUTH 2 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 24 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 20 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 833 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 67 |  |
| `public-data.holidays` | ✅ OK | 389 |  |
| `public-data.searchAddress` | ✅ OK | 99 |  |
| `public-data.aptTrades` | ✅ OK | 110 |  |
| `cafe24.listProducts` | ✅ OK | 2848 |  |
| `cafe24.getProduct` | ✅ OK | 1042 |  |
| `cafe24.listOrders` | ✅ OK | 183 |  |
| `cafe24.listBoards` | ✅ OK | 470 |  |
| `cafe24.updateInventory` | ✅ OK | 2835 |  |
| `naver-commerce.listProducts` | ✅ OK | 234 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 254 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | 🟡 DRIFT | 260 | removed timestamp, traceId · added changed, changed.lastChangeStatuses, changed.lastChangeStatuses[], changed.lastChangeStatuses[].orderId, changed.lastChangeSt |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 98 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2903 |  |
| `kakao.me` | ✅ OK | 288 |  |
| `kakao.sendToMe` | ✅ OK | 128 |  |
| `toss-payments.listSettlements` | ✅ OK | 337 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20047 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 102 |  |
| `delivery.listCarriers` | 🔑 AUTH | 52 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 41 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1574 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 64 |  |
