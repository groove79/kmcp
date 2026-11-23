## 🐤 K-MCP canary — 2026-11-23 09:35 KST (live)

✅ OK 21 · 🟡 DRIFT 2 · 🔴 BREAK 0 · 🔑 AUTH 4 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 20 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 22 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 711 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 93 |  |
| `public-data.holidays` | ✅ OK | 996 |  |
| `public-data.searchAddress` | ✅ OK | 92 |  |
| `public-data.aptTrades` | ✅ OK | 134 |  |
| `cafe24.listProducts` | ✅ OK | 3666 |  |
| `cafe24.getProduct` | ✅ OK | 863 |  |
| `cafe24.listOrders` | ✅ OK | 187 |  |
| `cafe24.listBoards` | ✅ OK | 600 |  |
| `cafe24.updateInventory` | ✅ OK | 3192 |  |
| `naver-commerce.listProducts` | ✅ OK | 266 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 261 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 176 |  |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 70 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2983 |  |
| `kakao.me` | 🔑 AUTH | 74 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `kakao.sendToMe` | 🔑 AUTH | 73 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `toss-payments.listSettlements` | ✅ OK | 292 |  |
| `toss-payments.listTransactions` | ✅ OK | 7154 |  |
| `toss-payments.getPaymentNotFound` | ✅ OK | 70 |  |
| `delivery.listCarriers` | 🔑 AUTH | 50 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 36 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 558 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 53 |  |
