## 🐤 K-MCP canary — 2026-11-05 09:41 KST (live)

✅ OK 23 · 🟡 DRIFT 4 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 20 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 25 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 811 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 949 |  |
| `public-data.holidays` | ✅ OK | 1163 |  |
| `public-data.searchAddress` | ✅ OK | 114 |  |
| `public-data.aptTrades` | ✅ OK | 105 |  |
| `cafe24.listProducts` | ✅ OK | 2976 |  |
| `cafe24.getProduct` | ✅ OK | 823 |  |
| `cafe24.listOrders` | ✅ OK | 160 |  |
| `cafe24.listBoards` | ✅ OK | 381 |  |
| `cafe24.updateInventory` | ✅ OK | 2698 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 224 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 256 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | 🟡 DRIFT | 237 | removed timestamp, traceId · added changed, changed.lastChangeStatuses, changed.lastChangeStatuses[], changed.lastChangeStatuses[].orderId, changed.lastChangeSt |
| `naver-commerce.listInquiries` | ✅ OK | 96 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2822 |  |
| `kakao.me` | ✅ OK | 308 |  |
| `kakao.sendToMe` | ✅ OK | 180 |  |
| `toss-payments.listSettlements` | ✅ OK | 290 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20004 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 83 |  |
| `delivery.listCarriers` | ✅ OK | 65 |  |
| `delivery.trackParcel` | ✅ OK | 354 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 584 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 64 |  |
