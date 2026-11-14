## 🐤 K-MCP canary — 2026-11-15 08:33 KST (live)

✅ OK 24 · 🟡 DRIFT 1 · 🔴 BREAK 0 · 🔑 AUTH 2 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 27 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 24 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 843 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 324 |  |
| `public-data.holidays` | ✅ OK | 367 |  |
| `public-data.searchAddress` | ✅ OK | 98 |  |
| `public-data.aptTrades` | ✅ OK | 95 |  |
| `cafe24.listProducts` | ✅ OK | 2584 |  |
| `cafe24.getProduct` | ✅ OK | 907 |  |
| `cafe24.listOrders` | ✅ OK | 423 |  |
| `cafe24.listBoards` | ✅ OK | 333 |  |
| `cafe24.updateInventory` | ✅ OK | 2914 |  |
| `naver-commerce.listProducts` | ✅ OK | 254 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 369 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 58 |  |
| `naver-commerce.listInquiries` | ✅ OK | 52 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2833 |  |
| `kakao.me` | ✅ OK | 305 |  |
| `kakao.sendToMe` | ✅ OK | 126 |  |
| `toss-payments.listSettlements` | ✅ OK | 254 |  |
| `toss-payments.listTransactions` | ✅ OK | 13264 |  |
| `toss-payments.getPaymentNotFound` | ✅ OK | 96 |  |
| `delivery.listCarriers` | 🔑 AUTH | 45 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 35 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1101 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 76 |  |
