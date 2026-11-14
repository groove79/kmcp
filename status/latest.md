## 🐤 K-MCP canary — 2026-11-14 09:37 KST (live)

✅ OK 23 · 🟡 DRIFT 2 · 🔴 BREAK 0 · 🔑 AUTH 2 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 20 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 24 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 811 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 108 |  |
| `public-data.holidays` | ✅ OK | 1276 |  |
| `public-data.searchAddress` | ✅ OK | 112 |  |
| `public-data.aptTrades` | ✅ OK | 120 |  |
| `cafe24.listProducts` | ✅ OK | 2469 |  |
| `cafe24.getProduct` | ✅ OK | 1000 |  |
| `cafe24.listOrders` | ✅ OK | 212 |  |
| `cafe24.listBoards` | ✅ OK | 373 |  |
| `cafe24.updateInventory` | ✅ OK | 2487 |  |
| `naver-commerce.listProducts` | ✅ OK | 551 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 274 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 128 |  |
| `naver-commerce.listInquiries` | ✅ OK | 58 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 3009 |  |
| `kakao.me` | ✅ OK | 316 |  |
| `kakao.sendToMe` | ✅ OK | 155 |  |
| `toss-payments.listSettlements` | ✅ OK | 380 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20005 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 90 |  |
| `delivery.listCarriers` | 🔑 AUTH | 41 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 35 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1031 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 76 |  |
