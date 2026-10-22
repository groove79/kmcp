# Platform signups — what 유성 does, what the code needs

Each entry: where to sign up, what to click, which env vars to drop into `/Volumes/Dev/.secrets/<platform>.env` (chmod 600). Nothing here is pasted into chat.

## Done
| Platform | env file | Notes |
|---|---|---|
| Naver Commerce | naver.env | IP allow-list → Mac mini runner only |
| Cafe24 (appmonster test mall) | cafe24.env | refresh token rotates → Neon canary_secrets |
| Kakao | kakao.env | refresh token rotates |
| Toss Payments (test) | toss.env | |
| data.go.kr / juso | datagokr.env | KR IP only; juso 운영키 before 10/28 |
| Delivery Tracker | delivery.env | **Free plan: 21-day keys** — renew at console.tracker.delivery → K-MCP (Appmonster) → Credentials → Create; canary AUTH = renew |

## Waiting
| Platform | Blocker | When it arrives |
|---|---|---|
| Popbill | LinkID 승인 메일 | popbill.env: `POPBILL_LINK_ID`, `POPBILL_SECRET_KEY`, `POPBILL_CORP_NUM=5287300609` → `node dist/cli.js record popbill` |
| Rakuten | portal 503 after app save | japan.env: `RAKUTEN_APP_ID`, `RAKUTEN_ACCESS_KEY`, `RAKUTEN_REFERER=https://github.com/groove79/kmcp` |

## Next (one evening each)

### 1. 11번가 — `packages/elevenst` (planned)
1. 판매자 가입: https://soffice.11st.co.kr (사업자 528-73-00609, 본인인증 필요 — 유성).
2. 셀러오피스 대시보드 하단 **[OPENAPI]** 링크 → OPEN API CENTER (openapi.11st.co.kr) → **API 관리** → 약관 동의.
3. 접속권한 신청: 셀링툴 업체 **미선택**, IP 직접 입력 **사용** → 개발 PC IP + Mac mini 공인 IP (canary) 입력, 이메일 appmonster.kr@gmail.com → 신청.
4. 추가 인증 후 페이지 상단의 **API KEY** 복사 → `elevenst.env`: `ELEVENST_API_KEY=…`.
5. 매뉴얼은 로그인 후에만 보임 → **서비스 등록·확인 / API 가이드** 페이지를 PDF로 저장해 `docs/vendor/11st/`에 넣어주면 그걸로 서버 작성.
- Auth: `openapikey` header, XML responses (legacy) — client will parse XML → JSON.
- Sources: [플레이오토 가이드](https://www.plto.com/customer/HelpDesc/gmp/13702/), [윈셀링 가이드](https://winselling.co.kr/guide/winshop/open_api/setting_11street)

### 2. Qoo10 Japan — `packages/qoo10` (planned)
1. 셀러 가입: https://www.qoo10.jp → QSM(Qoo10 Sales Manager). 해외 사업자 가능(사업자등록증, 대표자 신분증, 통장).
2. QSM → **chatでお問い合わせ(채팅 문의)** → "API キー発行をお願いします" (발급까지 며칠).
3. 받은 API key + QSM ID/PW로 `CreateCertificationKey` 호출 → 판매자 인증키(1년 유효) — 이 호출은 서버 cli가 해줌: `qoo10.env`: `QOO10_API_KEY`, `QOO10_USER_ID`, `QOO10_USER_PW` → `npx mcp-qoo10 auth` → `QOO10_CERT_KEY` 저장.
- Source: [stockcrew Qoo10 API 2026](https://stockcrew.co.jp/insights/qoo10-api-integration-specs-2026)

### 3. 고도몰5 체험몰 — `packages/godomall` (planned; clone of cafe24)
1. https://www.godo.co.kr → 무료 체험몰 생성.
2. 관리자 → 기본설정 → **오픈API 인증키 발급** ([NHN커머스 가이드](https://devcenter-help.nhn-commerce.com/guide/ready/api/openapi_userkey)) → `godomall.env`: `GODO_PARTNER_KEY`, `GODO_KEY`, `GODO_DOMAIN`.

### 4. ESM (G마켓·옥션) · 5. Shopee · 6. 채널톡 · 7. 이카운트
See docs/ROADMAP-PLATFORMS.md — all need a seller/partner account first; the env var names will be fixed when the package is scaffolded.
