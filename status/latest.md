## 🐤 K-MCP canary — 2026-11-04 09:20 KST (live)

✅ OK 24 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 23 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 14 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 911 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 133 |  |
| `public-data.holidays` | ✅ OK | 1239 |  |
| `public-data.searchAddress` | ✅ OK | 120 |  |
| `public-data.aptTrades` | ✅ OK | 97 |  |
| `cafe24.listProducts` | ✅ OK | 2281 |  |
| `cafe24.getProduct` | ✅ OK | 871 |  |
| `cafe24.listOrders` | ✅ OK | 190 |  |
| `cafe24.listBoards` | ✅ OK | 478 |  |
| `cafe24.updateInventory` | ✅ OK | 2759 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 289 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 314 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 65 |  |
| `naver-commerce.listInquiries` | ✅ OK | 112 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2735 |  |
| `kakao.me` | ✅ OK | 289 |  |
| `kakao.sendToMe` | ✅ OK | 136 |  |
| `toss-payments.listSettlements` | ✅ OK | 275 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20005 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 86 |  |
| `delivery.listCarriers` | ✅ OK | 57 |  |
| `delivery.trackParcel` | ✅ OK | 386 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 511 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 70 |  |
