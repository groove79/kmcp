## 🐤 K-MCP canary — 2026-11-22 09:04 KST (live)

✅ OK 21 · 🟡 DRIFT 2 · 🔴 BREAK 0 · 🔑 AUTH 4 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 18 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 19 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 777 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 89 |  |
| `public-data.holidays` | ✅ OK | 360 |  |
| `public-data.searchAddress` | ✅ OK | 129 |  |
| `public-data.aptTrades` | ✅ OK | 72 |  |
| `cafe24.listProducts` | ✅ OK | 2976 |  |
| `cafe24.getProduct` | ✅ OK | 945 |  |
| `cafe24.listOrders` | ✅ OK | 181 |  |
| `cafe24.listBoards` | ✅ OK | 475 |  |
| `cafe24.updateInventory` | ✅ OK | 2663 |  |
| `naver-commerce.listProducts` | ✅ OK | 265 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 258 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 129 |  |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 100 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2705 |  |
| `kakao.me` | 🔑 AUTH | 71 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `kakao.sendToMe` | 🔑 AUTH | 71 | Kakao refresh token expired (~2 months). Run:  npx @appmonster/mcp-kakao auth |
| `toss-payments.listSettlements` | ✅ OK | 279 |  |
| `toss-payments.listTransactions` | ✅ OK | 17744 |  |
| `toss-payments.getPaymentNotFound` | ✅ OK | 91 |  |
| `delivery.listCarriers` | 🔑 AUTH | 46 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `delivery.trackParcel` | 🔑 AUTH | 42 | Delivery Tracker [UNAUTHENTICATED]: Invalid or expired token. — Check DELIVERY_TRACKER_CLIENT_ID / DELIVERY_TRACKER_CLIENT_SECRET (console.tracker.delivery → pr |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 549 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 54 |  |
