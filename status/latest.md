## 🐤 K-MCP canary — 2026-11-01 07:57 KST (live)

✅ OK 25 · 🟡 DRIFT 2 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 13 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 19 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 578 |  |
| `japan-bridge.landedCost` | ✅ OK | 2 |  |
| `public-data.checkBusiness` | ✅ OK | 86 |  |
| `public-data.holidays` | ✅ OK | 370 |  |
| `public-data.searchAddress` | ✅ OK | 107 |  |
| `public-data.aptTrades` | ✅ OK | 110 |  |
| `cafe24.listProducts` | ✅ OK | 2525 |  |
| `cafe24.getProduct` | ✅ OK | 855 |  |
| `cafe24.listOrders` | ✅ OK | 165 |  |
| `cafe24.listBoards` | ✅ OK | 363 |  |
| `cafe24.updateInventory` | ✅ OK | 4101 |  |
| `naver-commerce.listProducts` | ✅ OK | 264 |  |
| `naver-commerce.getProduct` | 🟡 DRIFT | 187 | removed originProduct.detailAttribute.optionInfo.optionCombinationGroupNames, originProduct.detailAttribute.optionInfo.optionCombinationGroupNames.optionGroupNa |
| `naver-commerce.listOrders` | ✅ OK | 89 |  |
| `naver-commerce.listInquiries` | 🟡 DRIFT | 98 | added content[], content[].inquiryNo, content[].category, content[].title, content[].inquiryContent |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2792 |  |
| `kakao.me` | ✅ OK | 277 |  |
| `kakao.sendToMe` | ✅ OK | 176 |  |
| `toss-payments.listSettlements` | ✅ OK | 322 |  |
| `toss-payments.listTransactions` | ✅ OK | 13280 |  |
| `toss-payments.getPaymentNotFound` | ✅ OK | 85 |  |
| `delivery.listCarriers` | ✅ OK | 56 |  |
| `delivery.trackParcel` | ✅ OK | 246 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 392 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 58 |  |
