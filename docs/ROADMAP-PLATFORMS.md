# Platform roadmap — what to add next and what it takes

Status legend: ✅ shipped · 🟡 account needed · 🔒 API behind application/review · ❌ no public API · ↔ official MCP exists (we complement, don't compete)

## Shipped (10 + approval)
Naver Smart Store ✅ · Coupang Wing ✅(🟡 seller account) · Cafe24 ✅ · Public data ✅ · HWP ✅ · KakaoTalk ✅ · Popbill ✅(🟡 LinkID) · Toss Payments ✅ · Japan bridge (Rakuten ✅ key pending, Yahoo 🟡) · KR biz calendar ✅

## Recommended next — ranked by (Korean seller demand × API accessibility × no official MCP)

| # | Platform | Why it matters | API access | What 유성 must do | Effort |
|---|---|---|---|---|---|
| 1 | **11번가 (SK)** | top-4 KR marketplace; sellers already juggle it with Smart Store/Coupang | 🔒 오픈API센터 — seller login → API key; docs only visible after login; IP whitelist | 11번가 판매자 가입(사업자) → openapi.11st.co.kr 키 발급 → 매뉴얼 PDF를 `docs/vendor/`에 | 2 days |
| 2 | **ESM (G마켓·옥션)** | same tier as 11번가; one API for both | 🔒 ESM+ 판매자 → API 사용 신청(심사) | ESM 판매자 가입 → API 신청 | 2 days |
| 3 | **Qoo10 Japan (QAPI)** | the #1 channel for 일본 역직구 — ties into Japan bridge both directions (JP→KR sourcing, KR→JP selling) | 🔒 QSM 채팅으로 API 키 요청, seller key valid 1 year ([stockcrew 2026](https://stockcrew.co.jp/insights/qoo10-api-integration-specs-2026)) | Qoo10 Japan 셀러 가입(해외 판매자 가능) → QSM에서 키 요청 | 2 days |
| 4 | **고도몰 / 샵바이 (NHN커머스)** | 2nd/3rd largest KR hosted-mall platforms after Cafe24; same tool shape as our cafe24 server | 🔒 devcenter-help.nhn-commerce.com 오픈API 인증키 발급 (고도몰5); 샵바이는 OpenAPI/Admin API | 고도몰 무료 체험몰 + 인증키 | 1.5 days (clone cafe24 package) |
| 5 | **메이크샵** | 3rd hosted-mall platform; older but large installed base | 🔒 관리자 → API 설정 키 | 메이크샵 체험몰 | 1 day |
| 6 | **아임웹** | fast-growing D2C builder | 🔒 app-store model (OAuth2, app must be hosted) | needs our gateway (stage 2) | after gateway |
| 7 | **Shopee / Lazada Open Platform** | SEA cross-border from KR; partner apps free; good docs | 🔒 Open Platform developer account → app → shop authorization | Shopee 판매자(or test partner) 가입 | 2 days each |
| 8 | **Amazon SP-API (JP/US)** | biggest cross-border target; official docs, no official MCP for sellers | 🔒 Seller Central developer registration + LWA; review for restricted roles | Amazon 셀러 계정 + developer profile 승인(며칠) | 3 days |
| 9 | **TikTok Shop Partner API** | fastest-growing channel 2025–26 (KR launch) | 🔒 Partner Center app, review | 판매자 + 파트너센터 | 2 days |
| 10 | **이카운트(Ecount) ERP** | most-used SMB ERP in KR; invoices/inventory sync with the stores above | 🔒 ERP 로그인 → API 인증키 (유료 ERP 가입 필요) | 이카운트 가입(월 4만원대) | 1.5 days |
| 11 | **택배 추적 (스마트택배/Delivery Tracker)** | "내 주문 어디쯤?" — zero-key public API (tracker.delivery) | ✅ open | none | 0.5 day |
| 12 | **채널톡 Open API** | CS automation: unanswered chats → draft reply; pairs with naver inquiries | 🔒 채널톡 계정 → Open API 키 (무료 플랜 가능) | 채널톡 가입 | 1 day |
| 13 | **네이버 검색광고 API** | sellers' biggest cost center; report + bid adjust | 🔒 광고주 계정 → API 라이선스 | 광고주 가입 | 1.5 days |
| — | PortOne (포트원) | ↔ official MCP (`@portone/mcp-server`, docs + console) — we don't duplicate; our Toss server covers direct Toss merchants | | | |
| — | Shopify / Stripe / Google | ↔ official MCPs — compose, don't build | | | |
| — | 지그재그·무신사·올리브영 | ❌ no public seller API (partner-center only) → UI automation territory, skip | | | |
| — | 식스샵 | ❌ no API | | | |

### Suggested order for signups (one evening each)
1. 11번가 → 2. Qoo10 Japan → 3. 고도몰 체험몰 → 4. ESM → 5. Shopee → 6. 채널톡 → 7. 이카운트.
택배 추적(#11)은 계정 없이 바로 만들 수 있어 canary 구축 직후 끼워 넣습니다.

### Each new server gets, by convention
tools with `fetchImpl` injection · read/write annotations + approval hook · `node:test` suite on recorded cassettes · a `checks/<platform>.ts` canary · server.json for the registry · README with "where to get the key" in 5 lines.
