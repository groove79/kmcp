## 🐤 K-MCP canary — 2026-11-09 08:19 KST (live)

✅ OK 24 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 15 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 19 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 766 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 108 |  |
| `public-data.holidays` | ✅ OK | 434 |  |
| `public-data.searchAddress` | ✅ OK | 102 |  |
| `public-data.aptTrades` | ✅ OK | 105 |  |
| `cafe24.listProducts` | ✅ OK | 1938 |  |
| `cafe24.getProduct` | ✅ OK | 895 |  |
| `cafe24.listOrders` | ✅ OK | 157 |  |
| `cafe24.listBoards` | ✅ OK | 503 |  |
| `cafe24.updateInventory` | ✅ OK | 2650 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 196 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 221 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 109 |  |
| `naver-commerce.listInquiries` | ✅ OK | 53 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2700 |  |
| `kakao.me` | ✅ OK | 273 |  |
| `kakao.sendToMe` | ✅ OK | 114 |  |
| `toss-payments.listSettlements` | ✅ OK | 380 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20006 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 86 |  |
| `delivery.listCarriers` | ✅ OK | 149 |  |
| `delivery.trackParcel` | ✅ OK | 331 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 503 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 58 |  |
