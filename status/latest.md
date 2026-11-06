## 🐤 K-MCP canary — 2026-11-06 09:41 KST (live)

✅ OK 23 · 🟡 DRIFT 4 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 16 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 14 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 568 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 95 |  |
| `public-data.holidays` | ✅ OK | 1501 |  |
| `public-data.searchAddress` | ✅ OK | 119 |  |
| `public-data.aptTrades` | ✅ OK | 110 |  |
| `cafe24.listProducts` | ✅ OK | 3273 |  |
| `cafe24.getProduct` | ✅ OK | 918 |  |
| `cafe24.listOrders` | ✅ OK | 159 |  |
| `cafe24.listBoards` | ✅ OK | 456 |  |
| `cafe24.updateInventory` | ✅ OK | 2470 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 301 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 412 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | 🟡 DRIFT | 173 | removed timestamp, traceId · added changed, changed.lastChangeStatuses, changed.lastChangeStatuses[], changed.lastChangeStatuses[].orderId, changed.lastChangeSt |
| `naver-commerce.listInquiries` | ✅ OK | 79 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2893 |  |
| `kakao.me` | ✅ OK | 1011 |  |
| `kakao.sendToMe` | ✅ OK | 710 |  |
| `toss-payments.listSettlements` | ✅ OK | 263 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20004 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 90 |  |
| `delivery.listCarriers` | ✅ OK | 63 |  |
| `delivery.trackParcel` | ✅ OK | 303 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 813 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 73 |  |
