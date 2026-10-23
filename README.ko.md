# K-MCP — 한국에서 일하는 AI 에이전트를 위한 MCP 서버 모음

[![Glama](https://glama.ai/mcp/servers/groove79/kmcp/badges/score.svg)](https://glama.ai/mcp/servers/groove79/kmcp) [![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE) [![English](https://img.shields.io/badge/README-English-blue)](README.md)

Claude·ChatGPT·Cursor 같은 AI에게 **"스마트스토어 재고 맞춰줘", "이 사업자번호 정상이야?", "이 한글파일 표 뽑아줘", "세금계산서 발행해"** 를 시키면, 지금까지는 "그건 할 수 없어요"라는 답이 돌아왔습니다. 한국 플랫폼에 연결된 도구가 없었기 때문입니다.

K-MCP는 그 연결 도구(MCP 서버)를 한국 플랫폼별로 만들어 **무료·오픈소스(MIT)** 로 공개한 것입니다. 설치하면 AI가 직접 조회하고, 돈이 오가거나 되돌릴 수 없는 작업은 **사람이 확인한 뒤에만** 실행합니다.

## 무엇을 시킬 수 있나

| 플랫폼 | 설치 이름 | AI가 할 수 있는 일 |
|---|---|---|
| 🛒 네이버 스마트스토어 | `@appmonster/mcp-naver-commerce` | 상품 조회·**재고 변경**·**상품 등록**(이미지 업로드), 주문, 고객 문의 |
| 🛒 쿠팡 윙 | `@appmonster/mcp-coupang` | 상품, **옵션 재고·가격**, 발주서, **발송 처리** |
| 🛒 카페24 | `@appmonster/mcp-cafe24` | 상품, **품목 재고**, 주문, 게시판 |
| 🏛 공공데이터 | `@appmonster/mcp-public-data` | 사업자 상태(국세청), 공휴일, 도로명주소, 아파트 실거래가 |
| 📄 한글(HWP) | `@appmonster/mcp-hwp` | .hwp/.hwpx → 텍스트·표(JSON) 추출 — 키 필요 없음 |
| 💬 카카오톡 | `@appmonster/mcp-kakao` | 나에게/친구에게 보내기 |
| 🧾 팝빌 | `@appmonster/mcp-popbill` | **전자세금계산서** 발행·취소·조회, 홈택스 수집, **알림톡** |
| 💳 토스페이먼츠 | `@appmonster/mcp-toss-payments` | 결제 조회, **취소·환불**, 거래·정산 내역 |
| 🇯🇵 일본 소싱 | `@appmonster/mcp-japan-bridge` | 라쿠텐·야후 검색 → 관부가세 포함 원가 → 스마트스토어 등록 초안 |
| 📅 세무 캘린더 | `@appmonster/mcp-kr-biz-calendar` | 부가세·원천세·4대보험 신고일, 공휴일, 영업일 계산 — 키 필요 없음 |
| 📦 택배 조회 | `@appmonster/mcp-delivery` | CJ·우체국·한진·롯데·로젠·쿠팡 등 배송 추적, 일괄 조회 |

**굵은 글씨**가 쓰기 작업입니다. 실수로 실행되지 않게 아래 안전장치를 거칩니다.

## 이렇게 씁니다 (실제 프롬프트)

- **"어제 결제된 쿠팡 주문 전부 상품준비중 처리하고, 재고 5개 이하 옵션은 스마트스토어에서도 품절 처리해줘."**
- **"이 거래처 사업자번호 확인하고 문제 없으면 이번 달 납품분 세금계산서 발행해."**
- **"첨부한 공문(.hwp)에서 표 뽑아서 수량·단가 합계 내고 카톡으로 요약 보내줘."**
- **"라쿠텐에서 이 상품 찾아서 한국 판매가 계산하고 스마트스토어 등록 초안 만들어."**
- **"이번 달 우리 회사가 신고할 거 뭐 있고, 영업일 기준 며칠 남았어?"**

## 30초 설치

**Claude Desktop / Cursor / Windsurf** — MCP 설정 파일에 추가:

```json
{
  "mcpServers": {
    "kr-biz-calendar": { "command": "npx", "args": ["-y", "@appmonster/mcp-kr-biz-calendar"] },
    "hwp":             { "command": "npx", "args": ["-y", "@appmonster/mcp-hwp"] },
    "naver-commerce":  { "command": "npx", "args": ["-y", "@appmonster/mcp-naver-commerce"],
                         "env": { "NAVER_COMMERCE_CLIENT_ID": "…", "NAVER_COMMERCE_CLIENT_SECRET": "…" } }
  }
}
```

**Claude Code**:

```bash
claude mcp add kr-biz-calendar -- npx -y @appmonster/mcp-kr-biz-calendar
claude mcp add hwp -- npx -y @appmonster/mcp-hwp
```

세무 캘린더와 HWP는 키 없이 바로 됩니다. 나머지는 각 패키지 README(`packages/<이름>/README.md`)에 필요한 키와 발급 방법(대부분 무료, 5분)이 있습니다.

## 돈이 나가는 작업은 사람이 확인한 뒤에만

| 모드 | 설정 | 동작 |
|---|---|---|
| **확인**(기본) | 아무것도 안 함 | 첫 호출은 미리보기만 보여줍니다. 대화창에서 "진행해"라고 해야 실행됩니다. |
| **카톡 승인** | `OKAGENT_API_KEY` | [OK Agent](https://okagent.kr)가 카카오톡으로 승인 요청을 보내고, **승인**을 눌러야 실행됩니다. 자리를 비워도 되고 기록이 남습니다. |
| **바로 실행** | `KMCP_WRITE_MODE=direct` | 확인 없이 실행 — 완전히 믿는 스크립트용 |

무료 키(월 200건, 카드 불필요): **https://okagent.kr**

## 내 키는 내 컴퓨터에만

키는 환경변수로만 넣고, 각 서버는 해당 플랫폼 API하고만 통신합니다. 중간 서버를 거치지 않습니다. 코드는 전부 공개되어 있습니다.

## 필요한 플랫폼이 없나요?

**[→ 서버 요청하기](https://github.com/groove79/kmcp/issues/new?template=server-request.yml)** — 평일 기준 24~48시간 안에 조회 기능부터 올립니다. 후보: 11번가 · G마켓/옥션 · 고도몰 · 이카운트 ERP · 채널톡 · Qoo10 Japan.

---

MIT © [앱몬스터](https://appmonster.co.kr) — 스마트스토어를 직접 운영하는 1인 개발자가 만들었습니다. 문의: 010-7990-5703
