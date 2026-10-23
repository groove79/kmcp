## 🐤 K-MCP canary — 2026-10-24 07:44 KST (live)

✅ OK 24 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 4 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 14 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 519 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 568 |  |
| `public-data.holidays` | ✅ OK | 412 |  |
| `public-data.searchAddress` | ✅ OK | 121 |  |
| `public-data.aptTrades` | ✅ OK | 102 |  |
| `cafe24.listProducts` | ✅ OK | 1206 |  |
| `cafe24.getProduct` | ✅ OK | 829 |  |
| `cafe24.listOrders` | ✅ OK | 180 |  |
| `cafe24.listBoards` | ✅ OK | 383 |  |
| `cafe24.updateInventory` | ✅ OK | 2748 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 215 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 260 | removed originProduct.detailAttribute.seoInfo.sellerTags[], originProduct.detailAttribute.seoInfo.sellerTags[].text |
| `naver-commerce.listOrders` | ✅ OK | 126 |  |
| `naver-commerce.listInquiries` | ✅ OK | 110 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2936 |  |
| `kakao.me` | ✅ OK | 305 |  |
| `kakao.sendToMe` | ✅ OK | 126 |  |
| `toss-payments.listSettlements` | ✅ OK | 249 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20005 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 68 |  |
| `delivery.listCarriers` | ✅ OK | 44 |  |
| `delivery.trackParcel` | ✅ OK | 366 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 321 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 72 |  |
