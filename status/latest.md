## 🐤 K-MCP canary — 2026-11-13 09:52 KST (live)

✅ OK 23 · 🟡 DRIFT 2 · 🔴 BREAK 0 · 🔑 AUTH 2 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 22 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 24 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 1422 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 207 |  |
| `public-data.holidays` | ✅ OK | 1197 |  |
| `public-data.searchAddress` | ✅ OK | 96 |  |
| `public-data.aptTrades` | ✅ OK | 94 |  |
| `cafe24.listProducts` | ✅ OK | 2960 |  |
| `cafe24.getProduct` | ✅ OK | 809 |  |
| `cafe24.listOrders` | ✅ OK | 171 |  |
| `cafe24.listBoards` | ✅ OK | 443 |  |
| `cafe24.updateInventory` | ✅ OK | 2721 |  |
| `naver-commerce.listProducts` | ✅ OK | 246 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 238 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 117 |  |
| `naver-commerce.listInquiries` | ✅ OK | 85 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2785 |  |
| `kakao.me` | ✅ OK | 285 |  |
| `kakao.sendToMe` | ✅ OK | 123 |  |
| `toss-payments.listSettlements` | ✅ OK | 275 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20003 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 81 |  |
| `delivery.listCarriers` | 🔑 AUTH | 46 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 30 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 579 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 92 |  |
