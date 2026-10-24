## 🐤 K-MCP canary — 2026-10-25 07:08 KST (live)

✅ OK 24 · 🟡 DRIFT 3 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 5 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 10 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 577 |  |
| `japan-bridge.landedCost` | ✅ OK | 0 |  |
| `public-data.checkBusiness` | ✅ OK | 117 |  |
| `public-data.holidays` | ✅ OK | 1822 |  |
| `public-data.searchAddress` | ✅ OK | 134 |  |
| `public-data.aptTrades` | ✅ OK | 87 |  |
| `cafe24.listProducts` | ✅ OK | 2023 |  |
| `cafe24.getProduct` | ✅ OK | 1721 |  |
| `cafe24.listOrders` | ✅ OK | 243 |  |
| `cafe24.listBoards` | ✅ OK | 420 |  |
| `cafe24.updateInventory` | ✅ OK | 3011 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 237 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 293 | removed originProduct.detailAttribute.seoInfo.sellerTags[], originProduct.detailAttribute.seoInfo.sellerTags[].text |
| `naver-commerce.listOrders` | ✅ OK | 197 |  |
| `naver-commerce.listInquiries` | ✅ OK | 93 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2668 |  |
| `kakao.me` | ✅ OK | 297 |  |
| `kakao.sendToMe` | ✅ OK | 127 |  |
| `toss-payments.listSettlements` | ✅ OK | 197 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20006 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 73 |  |
| `delivery.listCarriers` | ✅ OK | 57 |  |
| `delivery.trackParcel` | ✅ OK | 309 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 412 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 71 |  |
