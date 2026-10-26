## 🐤 K-MCP canary — 2026-10-27 08:32 KST (live)

✅ OK 23 · 🟡 DRIFT 4 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 35 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 50 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 864 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 165 |  |
| `public-data.holidays` | ✅ OK | 374 |  |
| `public-data.searchAddress` | ✅ OK | 93 |  |
| `public-data.aptTrades` | ✅ OK | 116 |  |
| `cafe24.listProducts` | ✅ OK | 3503 |  |
| `cafe24.getProduct` | ✅ OK | 1044 |  |
| `cafe24.listOrders` | ✅ OK | 148 |  |
| `cafe24.listBoards` | ✅ OK | 364 |  |
| `cafe24.updateInventory` | ✅ OK | 2614 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 253 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 228 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 125 |  |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 65 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2701 |  |
| `kakao.me` | ✅ OK | 346 |  |
| `kakao.sendToMe` | ✅ OK | 114 |  |
| `toss-payments.listSettlements` | ✅ OK | 280 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20028 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 77 |  |
| `delivery.listCarriers` | ✅ OK | 191 |  |
| `delivery.trackParcel` | ✅ OK | 789 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 1155 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 80 |  |
