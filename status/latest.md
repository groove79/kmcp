## 🐤 K-MCP canary — 2026-11-10 11:32 KST (live)

✅ OK 24 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 25 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 15 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 766 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 99 |  |
| `public-data.holidays` | ✅ OK | 440 |  |
| `public-data.searchAddress` | ✅ OK | 86 |  |
| `public-data.aptTrades` | ✅ OK | 146 |  |
| `cafe24.listProducts` | ✅ OK | 2194 |  |
| `cafe24.getProduct` | ✅ OK | 1153 |  |
| `cafe24.listOrders` | ✅ OK | 182 |  |
| `cafe24.listBoards` | ✅ OK | 481 |  |
| `cafe24.updateInventory` | ✅ OK | 2590 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 239 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 264 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 125 |  |
| `naver-commerce.listInquiries` | ✅ OK | 137 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2966 |  |
| `kakao.me` | ✅ OK | 261 |  |
| `kakao.sendToMe` | ✅ OK | 160 |  |
| `toss-payments.listSettlements` | ✅ OK | 306 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20008 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 83 |  |
| `delivery.listCarriers` | ✅ OK | 58 |  |
| `delivery.trackParcel` | ✅ OK | 372 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 448 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 67 |  |
