## 🐤 K-MCP canary — 2026-10-23 07:51 KST (live)

✅ OK 26 · 🟡 DRIFT 1 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 4

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 4 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 33 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 732 |  |
| `japan-bridge.landedCost` | ✅ OK | 1 |  |
| `public-data.checkBusiness` | ✅ OK | 131 |  |
| `public-data.holidays` | ✅ OK | 404 |  |
| `public-data.searchAddress` | ✅ OK | 95 |  |
| `public-data.aptTrades` | ✅ OK | 73 |  |
| `cafe24.listProducts` | ✅ OK | 1812 |  |
| `cafe24.getProduct` | ✅ OK | 893 |  |
| `cafe24.listOrders` | ✅ OK | 191 |  |
| `cafe24.listBoards` | ✅ OK | 407 |  |
| `cafe24.updateInventory` | ✅ OK | 2453 |  |
| `naver-commerce.listProducts` | ✅ OK | 260 |  |
| `naver-commerce.getProduct` | ✅ OK | 284 |  |
| `naver-commerce.listOrders` | ✅ OK | 59 |  |
| `naver-commerce.listInquiries` | ✅ OK | 82 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2834 |  |
| `kakao.me` | ✅ OK | 271 |  |
| `kakao.sendToMe` | ✅ OK | 163 |  |
| `toss-payments.listSettlements` | ✅ OK | 301 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20006 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 83 |  |
| `delivery.listCarriers` | ✅ OK | 60 |  |
| `delivery.trackParcel` | ✅ OK | 551 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ✅ OK | 286 |  |
| `popbill.searchTaxinvoices` | ✅ OK | 59 |  |
