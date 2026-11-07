## 🐤 K-MCP canary — 2026-11-08 08:16 KST (live)

✅ OK 24 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 25 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 15 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 754 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 67 |  |
| `public-data.holidays` | ✅ OK | 603 |  |
| `public-data.searchAddress` | ✅ OK | 113 |  |
| `public-data.aptTrades` | ✅ OK | 94 |  |
| `cafe24.listProducts` | ✅ OK | 2804 |  |
| `cafe24.getProduct` | ✅ OK | 1127 |  |
| `cafe24.listOrders` | ✅ OK | 159 |  |
| `cafe24.listBoards` | ✅ OK | 683 |  |
| `cafe24.updateInventory` | ✅ OK | 2750 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 333 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 243 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 96 |  |
| `naver-commerce.listInquiries` | ✅ OK | 53 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2738 |  |
| `kakao.me` | ✅ OK | 284 |  |
| `kakao.sendToMe` | ✅ OK | 148 |  |
| `toss-payments.listSettlements` | ✅ OK | 332 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20006 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 87 |  |
| `delivery.listCarriers` | ✅ OK | 81 |  |
| `delivery.trackParcel` | ✅ OK | 290 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 778 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 53 |  |
