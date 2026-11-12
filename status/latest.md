## 🐤 K-MCP canary — 2026-11-12 10:49 KST (live)

✅ OK 24 · 🟡 DRIFT 1 · 🔴 BREAK 0 · 🔑 AUTH 2 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 21 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 24 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 788 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 124 |  |
| `public-data.holidays` | ✅ OK | 402 |  |
| `public-data.searchAddress` | ✅ OK | 85 |  |
| `public-data.aptTrades` | ✅ OK | 98 |  |
| `cafe24.listProducts` | ✅ OK | 2512 |  |
| `cafe24.getProduct` | ✅ OK | 933 |  |
| `cafe24.listOrders` | ✅ OK | 166 |  |
| `cafe24.listBoards` | ✅ OK | 355 |  |
| `cafe24.updateInventory` | ✅ OK | 2735 |  |
| `naver-commerce.listProducts` | ✅ OK | 334 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 213 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 101 |  |
| `naver-commerce.listInquiries` | ✅ OK | 94 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 3287 |  |
| `kakao.me` | ✅ OK | 326 |  |
| `kakao.sendToMe` | ✅ OK | 145 |  |
| `toss-payments.listSettlements` | ✅ OK | 389 |  |
| `toss-payments.listTransactions` | ✅ OK | 16392 |  |
| `toss-payments.getPaymentNotFound` | ✅ OK | 70 |  |
| `delivery.listCarriers` | 🔑 AUTH | 49 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 40 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1153 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 92 |  |
