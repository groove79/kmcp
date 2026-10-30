## 🐤 K-MCP canary — 2026-10-31 08:25 KST (live)

✅ OK 24 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 20 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 18 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 833 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 66 |  |
| `public-data.holidays` | ✅ OK | 324 |  |
| `public-data.searchAddress` | ✅ OK | 132 |  |
| `public-data.aptTrades` | ✅ OK | 97 |  |
| `cafe24.listProducts` | ✅ OK | 2587 |  |
| `cafe24.getProduct` | ✅ OK | 813 |  |
| `cafe24.listOrders` | ✅ OK | 230 |  |
| `cafe24.listBoards` | ✅ OK | 335 |  |
| `cafe24.updateInventory` | ✅ OK | 2606 |  |
| `naver-commerce.listProducts` | ✅ OK | 237 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 259 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 113 |  |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 102 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2621 |  |
| `kakao.me` | ✅ OK | 303 |  |
| `kakao.sendToMe` | ✅ OK | 151 |  |
| `toss-payments.listSettlements` | ✅ OK | 291 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20006 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 68 |  |
| `delivery.listCarriers` | ✅ OK | 55 |  |
| `delivery.trackParcel` | ✅ OK | 369 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 388 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 81 |  |
