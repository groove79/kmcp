## 🐤 K-MCP canary — 2026-11-02 08:15 KST (live)

✅ OK 24 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 18 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 18 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 789 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 4565 |  |
| `public-data.holidays` | ✅ OK | 398 |  |
| `public-data.searchAddress` | ✅ OK | 90 |  |
| `public-data.aptTrades` | ✅ OK | 99 |  |
| `cafe24.listProducts` | ✅ OK | 1984 |  |
| `cafe24.getProduct` | ✅ OK | 946 |  |
| `cafe24.listOrders` | ✅ OK | 279 |  |
| `cafe24.listBoards` | ✅ OK | 462 |  |
| `cafe24.updateInventory` | ✅ OK | 2643 |  |
| `naver-commerce.listProducts` | ✅ OK | 286 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 242 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | 🟡 DRIFT | 227 | removed timestamp, traceId · added changed, changed.lastChangeStatuses, changed.lastChangeStatuses[], changed.lastChangeStatuses[].orderId, changed.lastChangeSt |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 134 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2923 |  |
| `kakao.me` | ✅ OK | 292 |  |
| `kakao.sendToMe` | ✅ OK | 161 |  |
| `toss-payments.listSettlements` | ✅ OK | 300 |  |
| `toss-payments.listTransactions` | ✅ OK | 3698 |  |
| `toss-payments.getPaymentNotFound` | ✅ OK | 63 |  |
| `delivery.listCarriers` | ✅ OK | 55 |  |
| `delivery.trackParcel` | ✅ OK | 462 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 424 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 64 |  |
