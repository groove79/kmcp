## 🐤 K-MCP canary — 2026-10-30 08:45 KST (live)

✅ OK 23 · 🟡 DRIFT 4 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 19 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 18 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 889 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 120 |  |
| `public-data.holidays` | ✅ OK | 342 |  |
| `public-data.searchAddress` | ✅ OK | 130 |  |
| `public-data.aptTrades` | ✅ OK | 117 |  |
| `cafe24.listProducts` | ✅ OK | 2272 |  |
| `cafe24.getProduct` | ✅ OK | 795 |  |
| `cafe24.listOrders` | ✅ OK | 159 |  |
| `cafe24.listBoards` | ✅ OK | 365 |  |
| `cafe24.updateInventory` | ✅ OK | 2694 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 652 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 288 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 125 |  |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 151 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2835 |  |
| `kakao.me` | ✅ OK | 284 |  |
| `kakao.sendToMe` | ✅ OK | 123 |  |
| `toss-payments.listSettlements` | ✅ OK | 355 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20006 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 90 |  |
| `delivery.listCarriers` | ✅ OK | 63 |  |
| `delivery.trackParcel` | ✅ OK | 712 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1233 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 58 |  |
