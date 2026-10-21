# 공통 게이트웨이 설계 (K-MCP Gateway)

> 상태: 설계 확정 (2026-10-21). 구현은 2단계(제품 1 서버 3종 + 승인 앱 배포 후).

## 왜 필요한가

지금의 stdio 패키지(`npx @appmonster/mcp-*`)는 **사용자 PC에서 실행**된다. 잘 동작하지만 세 가지 한계가 있다.

1. **과금 불가** — 로컬에서 도는 코드는 호출을 셀 수 없다. 플랜(Free/Pro)이 성립하려면 호출이 우리 서버를 거쳐야 한다.
2. **호스팅형 에이전트가 못 쓴다** — Claude.ai 커넥터, ChatGPT, Dify, n8n 클라우드 등은 stdio를 못 띄운다. **Streamable HTTP** 에드포인트가 있어야 한다. MCP 레지스트리도 `remotes`(URL)를 지원한다.
3. **네이버 IP 화이트리스트** — 네이버 커머스 API는 앱마다 허용 IP를 등록해야 한다. 서버리스(Vercel)는 고정 IP가 없어 매 호출 IP가 바뀐다 → 게이트웨이는 **고정 egress IP**가 필요하다.

## 구조

```
에이전트 (Claude / ChatGPT / Cursor / n8n …)
   │  MCP over Streamable HTTP  (Authorization: Bearer kmcp_xxx)
   ▼
┌────────────────────────────────────────────┐
│  gateway.appmonster.co.kr  (단일 MCP 서버)   │
│  ① 키 검증 → 사용자·플랜                      │
│  ② 사용자의 "연결"(네이버/카페24/공공데이터 자격증명) 로드 │
│  ③ 도구 라우팅 → 패키지 핸들러 (같은 코드 재사용)│
│  ④ write 도구 → OK Agent 승인 훅              │
│  ⑤ 호출 카운트·로그 → 과금                    │
└───────────────────────────────────────────┘
   │ 고정 IP (네이버 화이트리스트에 1회 등록)
   ▼
네이버 커머스 / 카페24 / data.go.kr / juso …
```

핵심 원칙: **패키지 코드를 두 번 쓰지 않는다.** 각 패키지의 `tools.ts`는 이미 `client`를 주입받는 순수 함수 목록이므로, 게이트웨이는 사용자별 client를 만들어 같은 도구 목록을 그대로 등록한다. stdio 패키지와 게이트웨이는 같은 `tools.ts`를 import한다.

## 사용자 모델

| 개념 | 설명 |
|---|---|
| **계정** | 이메일 로그인(매직링크). 앱몬스터 공통 계정으로 AEO·OK Agent와 공유 |
| **API 키** | `kmcp_` 접두. 계정당 여러 개(에이전트별). 해시 저장, 생성 시 1회 표시 |
| **연결(Connection)** | 외부 서비스 자격증명. 종류: `naver-commerce`(client id/secret), `cafe24`(OAuth 토큰, 갱신 자동), `public-data`(키). AES-GCM 암호화, KMS 키는 환경변수 |
| **플랜** | Free: 월 1,000 호출 / Pro 29,000원: 무제한 + HWP 500파일 + 알림 1,000건. 계획서 과금 표와 동일 |
| **승인 정책** | 계정 단위: `write` 도구를 (a) 항상 승인 (b) 금액 ≥ N원만 (c) 승인 없이. OK Agent 연동 |

## 도구 노출 방식

한 에드포인트에서 모든 도구를 노출하되, **연결된 서비스의 도구만** `tools/list`에 나온다 (네이버 미연결 사용자에게 `naver_*`가 보이면 에이전트가 헛호출한다).

도구 이름은 패키지와 동일 (`naver_list_products`, `cafe24_update_inventory`, `kr_check_business`, `hwp_to_markdown`). 에이전트 입장에서 로컬 패키지와 게이트웨이를 바꿔 끼워도 프롬프트를 고칠 필요가 없다.

HWP 변환은 자격증명이 필요 없으므로 연결 없이 노출. 파일은 base64 또는 URL — 25MB 상한 유지.

## 승인 훅 통합

```ts
// gateway/src/approve.ts
const approver = createApprover(okagentClient, { source: `gateway:${userId}` });
server.registerTool(name, def, async (args) => {
  if (def.annotations?.destructiveHint && policy.requiresApproval(name, args)) {
    const ok = await approver(name, args, describeToolCall(name, args));
    if (!ok) return { content: [{ type: "text", text: "사용자가 거부했습니다." }], isError: true };
  }
  return handler(args);
});
```

`@appmonster/approval` 이 이미 이 모양이라 게이트웨이는 OK Agent 키를 사용자 대신 갖고 호출한다 (사용자는 OK Agent에 따로 가입하지 않는다 — 같은 계정).

## 인프라 선택

| 후보 | 고정 IP | 장기 실행(SSE) | 비용 | 결론 |
|---|---|---|---|---|
| Vercel | ✗ (Secure Compute는 Enterprise) | 제한적 | 무료~ | 랜딩·대시보드만 |
| **Fly.io** (nrt 도쿄) | ✓ 전용 IPv4 $2/월 | ✓ | ~$5/월 | **게이트웨이 본체** |
| Cloud Run + Cloud NAT | ✓ | ✓ | NAT 비용 ↑ | 보류 |
| Hetzner/Vultr VPS | ✓ | ✓ | $5/월 | Fly 문제 시 대안 |

- 런타임: Node 22 + `@modelcontextprotocol/sdk` Streamable HTTP 트랜스포트 (`StreamableHTTPServerTransport`), 세션은 Redis(Upstash) 또는 메모리(단일 인스턴스면 충분)
- DB: Neon Postgres (OK Agent와 같은 프로젝트, 다른 스키마)
- 도메인: `gateway.appmonster.co.kr` → Fly 앱. 사용자 안내에 "네이버 API 허용 IP에 `x.x.x.x` 등록"
- 관측: 호출마다 `{userId, tool, ms, ok, bytes}` 한 줄 → Postgres `calls` 테이블 (과금·대시보드 공용)

## 레지스트리·발견

- 각 `server.json`에 `remotes: [{ type: "streamable-http", url: "https://gateway.appmonster.co.kr/mcp" }]` 추가 → 레지스트리에서 "원격으로 쓰기" 선택지가 생김
- Claude.ai 커넥터·ChatGPT 앱에는 OAuth 2.1 Dynamic Client Registration이 필요 → 2단계 후반 (처음엔 Bearer 키로 Cursor/Claude Code/n8n 커버)

## 구현 순서 (2단계)

1. `packages/gateway` 생성 — HTTP 트랜스포트 + Bearer 키 + 네이버·공공데이터·HWP 라우팅 (카페24는 OAuth 저장 후)
2. 계정·키·연결 테이블 + 대시보드 최소 UI(키 발급, 네이버 자격증명 입력, 승인 정책)
3. Fly 배포 + 고정 IP + 도메인
4. `server.json` 에 remotes 추가 → 재발행
5. 호출 카운트 → Free 한도 → 토스페이먼츰 빌링 (Pro)

완료 기준: 호스팅 에이전트(n8n 클라우드 또는 Claude.ai 커넥터)에서 게이트웨이 키만으로 네이버 상품 조회 + 재고 변경(승인 거쳐) 성공.
