## 🐤 K-MCP canary — 2026-10-29 08:45 KST (live)

✅ OK 23 · 🟡 DRIFT 4 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 53 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 19 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 610 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 80 |  |
| `public-data.holidays` | ✅ OK | 367 |  |
| `public-data.searchAddress` | ✅ OK | 105 |  |
| `public-data.aptTrades` | ✅ OK | 122 |  |
| `cafe24.listProducts` | ✅ OK | 1607 |  |
| `cafe24.getProduct` | ✅ OK | 951 |  |
| `cafe24.listOrders` | ✅ OK | 182 |  |
| `cafe24.listBoards` | ✅ OK | 360 |  |
| `cafe24.updateInventory` | ✅ OK | 2501 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 246 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 265 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 137 |  |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 109 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2819 |  |
| `kakao.me` | ✅ OK | 269 |  |
| `kakao.sendToMe` | ✅ OK | 123 |  |
| `toss-payments.listSettlements` | ✅ OK | 189 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20035 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 83 |  |
| `delivery.listCarriers` | ✅ OK | 71 |  |
| `delivery.trackParcel` | ✅ OK | 312 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 700 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 67 |  |
