## 🐤 K-MCP canary — 2026-10-28 08:21 KST (live)

✅ OK 23 · 🟡 DRIFT 4 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 21 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 14 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 789 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 100 |  |
| `public-data.holidays` | ✅ OK | 593 |  |
| `public-data.searchAddress` | ✅ OK | 130 |  |
| `public-data.aptTrades` | ✅ OK | 113 |  |
| `cafe24.listProducts` | ✅ OK | 2119 |  |
| `cafe24.getProduct` | ✅ OK | 819 |  |
| `cafe24.listOrders` | ✅ OK | 169 |  |
| `cafe24.listBoards` | ✅ OK | 362 |  |
| `cafe24.updateInventory` | ✅ OK | 2686 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 261 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 293 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 112 |  |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 89 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2871 |  |
| `kakao.me` | ✅ OK | 274 |  |
| `kakao.sendToMe` | ✅ OK | 119 |  |
| `toss-payments.listSettlements` | ✅ OK | 251 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20006 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 99 |  |
| `delivery.listCarriers` | ✅ OK | 58 |  |
| `delivery.trackParcel` | ✅ OK | 420 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 476 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 87 |  |
