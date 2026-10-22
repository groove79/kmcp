## 🐤 K-MCP canary — 2026-10-22 09:53 KST (live)

✅ OK 22 · 🟡 DRIFT 1 · 🔴 BREAK 0 · 🔑 AUTH 0 · ⛔ DOWN 0 · ⚪ SKIP 5

| check | class | ms | note |
|---|---|---|---|
| `kr-biz-calendar.isBusinessDay` | ✅ OK | 4 |  |
| `kr-biz-calendar.taxCalendar` | ✅ OK | 1 |  |
| `hwp.convertRealFile` | ⚪ SKIP | 0 | needs CANARY_HWP_FILE — set CANARY_HWP_FILE=/path/to/any.hwp |
| `japan-bridge.searchRakuten` | ⚪ SKIP | 0 | needs RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY — https://webservice.rakuten.co.jp/app/create |
| `japan-bridge.searchYahoo` | ⚪ SKIP | 0 | needs YAHOO_JP_APP_ID — https://e.developer.yahoo.co.jp/register |
| `japan-bridge.fxRate` | ✅ OK | 478 |  |
| `japan-bridge.landedCost` | ✅ OK | 2 |  |
| `public-data.checkBusiness` | ✅ OK | 86 |  |
| `public-data.holidays` | ✅ OK | 1125 |  |
| `public-data.searchAddress` | ✅ OK | 91 |  |
| `public-data.aptTrades` | ✅ OK | 73 |  |
| `cafe24.listProducts` | ✅ OK | 1686 |  |
| `cafe24.getProduct` | ✅ OK | 898 |  |
| `cafe24.listOrders` | ✅ OK | 224 |  |
| `cafe24.listBoards` | ✅ OK | 465 |  |
| `cafe24.updateInventory` | ✅ OK | 2651 |  |
| `naver-commerce.listProducts` | ✅ OK | 245 |  |
| `naver-commerce.getProduct` | ✅ OK | 484 |  |
| `naver-commerce.listOrders` | ✅ OK | 135 |  |
| `naver-commerce.listInquiries` | ✅ OK | 83 |  |
| `naver-commerce.createDecoyProduct` | ✅ OK | 2719 |  |
| `kakao.me` | ✅ OK | 122 |  |
| `kakao.sendToMe` | ✅ OK | 114 |  |
| `toss-payments.listSettlements` | ✅ OK | 225 |  |
| `toss-payments.listTransactions` | 🟡 DRIFT | 20004 | known issue: Toss test merchants: GET /v1/transactions never answers (observed 2026-10-21/22). Re-check after a live key is available. · Toss API GET /v1/transa |
| `toss-payments.getPaymentNotFound` | ✅ OK | 89 |  |
| `coupang.listProducts` | ⚪ SKIP | 0 | needs COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID — https://wing.coupang.com → 추가판매정보 → OPEN API 키 |
| `popbill.checkAccount` | ⚪ SKIP | 0 | needs POPBILL_LINK_ID, POPBILL_SECRET_KEY, POPBILL_CORP_NUM — https://developers.popbill.com (API 연동신청 → 테스트 LinkID) |
