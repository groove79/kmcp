## 🐤 K-MCP canary — 2026-11-17 11:46 KST (live)

✅ OK 22 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 2 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 26 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 25 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 765 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 112 |  |
| `public-data.holidays` | ✅ OK | 596 |  |
| `public-data.searchAddress` | ✅ OK | 84 |  |
| `public-data.aptTrades` | ✅ OK | 111 |  |
| `cafe24.listProducts` | ✅ OK | 4362 |  |
| `cafe24.getProduct` | ✅ OK | 887 |  |
| `cafe24.listOrders` | ✅ OK | 175 |  |
| `cafe24.listBoards` | ✅ OK | 437 |  |
| `cafe24.updateInventory` | ✅ OK | 2690 |  |
| `naver-commerce.listProducts` | ✅ OK | 257 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 231 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | 🟡 DRIFT | 310 | removed timestamp, traceId · added changed, changed.lastChangeStatuses, changed.lastChangeStatuses[], changed.lastChangeStatuses[].orderId, changed.lastChangeSt |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 67 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 3177 |  |
| `kakao.me` | ✅ OK | 1586 |  |
| `kakao.sendToMe` | ✅ OK | 483 |  |
| `toss-payments.listSettlements` | ✅ OK | 241 |  |
| `toss-payments.listTransactions` | ✅ OK | 14335 |  |
| `toss-payments.getPaymentNotFound` | ✅ OK | 85 |  |
| `delivery.listCarriers` | 🔑 AUTH | 49 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 37 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 975 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 66 |  |
