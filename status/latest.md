## 🐤 K-MCP canary — 2026-11-24 13:35 KST (live)

✅ OK 20 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 4 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 16 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 29 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 799 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 92 |  |
| `public-data.holidays` | ✅ OK | 519 |  |
| `public-data.searchAddress` | ✅ OK | 96 |  |
| `public-data.aptTrades` | ✅ OK | 95 |  |
| `cafe24.listProducts` | ✅ OK | 2708 |  |
| `cafe24.getProduct` | ✅ OK | 926 |  |
| `cafe24.listOrders` | ✅ OK | 295 |  |
| `cafe24.listBoards` | ✅ OK | 391 |  |
| `cafe24.updateInventory` | ✅ OK | 2746 |  |
| `naver-commerce.listProducts` | ✅ OK | 237 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 296 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | 🟡 DRIFT | 189 | removed timestamp, traceId · added changed, changed.lastChangeStatuses, changed.lastChangeStatuses[], changed.lastChangeStatuses[].orderId, changed.lastChangeSt |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 98 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2827 |  |
| `kakao.me` | 🔑 AUTH | 73 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `kakao.sendToMe` | 🔑 AUTH | 71 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `toss-payments.listSettlements` | ✅ OK | 242 |  |
| `toss-payments.listTransactions` | ✅ OK | 11531 |  |
| `toss-payments.getPaymentNotFound` | ✅ OK | 77 |  |
| `delivery.listCarriers` | 🔑 AUTH | 58 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 32 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 4781 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 59 |  |
