## 🐤 K-MCP canary — 2026-11-11 09:22 KST (live)

✅ OK 23 · 🟡 DRIFT 4 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 24 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 19 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 1288 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 89 |  |
| `public-data.holidays` | ✅ OK | 1219 |  |
| `public-data.searchAddress` | ✅ OK | 94 |  |
| `public-data.aptTrades` | ✅ OK | 113 |  |
| `cafe24.listProducts` | ✅ OK | 3188 |  |
| `cafe24.getProduct` | ✅ OK | 1034 |  |
| `cafe24.listOrders` | ✅ OK | 193 |  |
| `cafe24.listBoards` | ✅ OK | 412 |  |
| `cafe24.updateInventory` | ✅ OK | 2882 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 252 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 278 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | 🟡 DRIFT | 215 | removed timestamp, traceId · added changed, changed.lastChangeStatuses, changed.lastChangeStatuses[], changed.lastChangeStatuses[].orderId, changed.lastChangeSt |
| `naver-commerce.listInquiries` | ✅ OK | 109 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2856 |  |
| `kakao.me` | ✅ OK | 459 |  |
| `kakao.sendToMe` | ✅ OK | 179 |  |
| `toss-payments.listSettlements` | ✅ OK | 648 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20005 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 77 |  |
| `delivery.listCarriers` | ✅ OK | 54 |  |
| `delivery.trackParcel` | ✅ OK | 360 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 548 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 76 |  |
