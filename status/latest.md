## 🐤 K-MCP canary — 2026-11-16 08:43 KST (live)

✅ OK 24 · 🟡 DRIFT 1 · 🔴 BREAK 0 · 🔑 AUTH 2 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 22 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 24 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 832 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 96 |  |
| `public-data.holidays` | ✅ OK | 358 |  |
| `public-data.searchAddress` | ✅ OK | 142 |  |
| `public-data.aptTrades` | ✅ OK | 100 |  |
| `cafe24.listProducts` | ✅ OK | 3467 |  |
| `cafe24.getProduct` | ✅ OK | 925 |  |
| `cafe24.listOrders` | ✅ OK | 254 |  |
| `cafe24.listBoards` | ✅ OK | 387 |  |
| `cafe24.updateInventory` | ✅ OK | 2649 |  |
| `naver-commerce.listProducts` | ✅ OK | 419 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 271 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 91 |  |
| `naver-commerce.listInquiries` | ✅ OK | 139 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2912 |  |
| `kakao.me` | ✅ OK | 313 |  |
| `kakao.sendToMe` | ✅ OK | 121 |  |
| `toss-payments.listSettlements` | ✅ OK | 321 |  |
| `toss-payments.listTransactions` | ✅ OK | 8143 |  |
| `toss-payments.getPaymentNotFound` | ✅ OK | 66 |  |
| `delivery.listCarriers` | 🔑 AUTH | 54 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 42 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1268 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 56 |  |
