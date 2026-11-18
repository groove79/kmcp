## 🐤 K-MCP canary — 2026-11-18 11:02 KST (live)

✅ OK 22 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 2 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 23 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 20 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 766 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 89 |  |
| `public-data.holidays` | ✅ OK | 417 |  |
| `public-data.searchAddress` | ✅ OK | 118 |  |
| `public-data.aptTrades` | ✅ OK | 119 |  |
| `cafe24.listProducts` | ✅ OK | 3002 |  |
| `cafe24.getProduct` | ✅ OK | 855 |  |
| `cafe24.listOrders` | ✅ OK | 175 |  |
| `cafe24.listBoards` | ✅ OK | 398 |  |
| `cafe24.updateInventory` | ✅ OK | 2756 |  |
| `naver-commerce.listProducts` | ✅ OK | 265 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 226 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 132 |  |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 110 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2828 |  |
| `kakao.me` | ✅ OK | 469 |  |
| `kakao.sendToMe` | ✅ OK | 150 |  |
| `toss-payments.listSettlements` | ✅ OK | 437 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20005 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 85 |  |
| `delivery.listCarriers` | 🔑 AUTH | 51 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 37 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1635 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 80 |  |
