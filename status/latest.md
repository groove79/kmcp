## 🐤 K-MCP canary — 2026-10-26 07:13 KST (live)

✅ OK 25 · 🟡 DRIFT 2 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 5 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 15 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 676 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 296 |  |
| `public-data.holidays` | ✅ OK | 5055 |  |
| `public-data.searchAddress` | ✅ OK | 88 |  |
| `public-data.aptTrades` | ✅ OK | 158 |  |
| `cafe24.listProducts` | ✅ OK | 4277 |  |
| `cafe24.getProduct` | ✅ OK | 945 |  |
| `cafe24.listOrders` | ✅ OK | 219 |  |
| `cafe24.listBoards` | ✅ OK | 401 |  |
| `cafe24.updateInventory` | ✅ OK | 3028 |  |
| `naver-commerce.listProducts` | 🟡 DRIFT | 256 | removed contents[].channelProducts[].sellerTags[], contents[].channelProducts[].sellerTags[].text |
| `naver-commerce.getProduct` | 🟡 DRIFT | 268 | removed originProduct.detailAttribute.seoInfo.sellerTags[], originProduct.detailAttribute.seoInfo.sellerTags[].text |
| `naver-commerce.listOrders` | ✅ OK | 145 |  |
| `naver-commerce.listInquiries` | ✅ OK | 54 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 3142 |  |
| `kakao.me` | ✅ OK | 300 |  |
| `kakao.sendToMe` | ✅ OK | 132 |  |
| `toss-payments.listSettlements` | ✅ OK | 258 |  |
| `toss-payments.listTransactions` | ✅ OK | 17110 |  |
| `toss-payments.getPaymentNotFound` | ✅ OK | 81 |  |
| `delivery.listCarriers` | ✅ OK | 93 |  |
| `delivery.trackParcel` | ✅ OK | 311 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 416 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 77 |  |
