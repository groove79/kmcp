# @appmonster/mcp-popbill

MCP server for **Popbill (팝빌)** — the Korean e-document platform that fronts Hometax. One server gives an agent:

- **전자세금계산서**: search, read, **issue** (saved + issued + reported to the NTS in one call), cancel
- **홈택스 수집**: pull sales/purchase invoices issued anywhere (not only via Popbill) for bookkeeping and VAT prep
- **카카오 알림톡**: official KakaoTalk business notifications with approved templates (SMS fallback)

All writes cost Popbill points and/or reach the 국세청 or real phones, so every write tool runs through the human approval hook ([OK Agent](https://github.com/groove79/okagent)) when configured.

## Tools

| Tool | Access | What it does |
|---|---|---|
| `popbill_check_account` | read | 회원 여부·포인트 잔액 |
| `popbill_search_taxinvoices` | read | 매출/매입 세금계산서 검색 (기간·상태·텍스트) |
| `popbill_get_taxinvoice` | read | 세금계산서 상세 + 보기 URL |
| `popbill_issue_taxinvoice` | **write** | 정발행 즉시발행 — 품목에서 공급가액·세액·합계 자동 계산 |
| `popbill_cancel_taxinvoice` | **write** | 발행취소 (국세청 전송 전) |
| `popbill_hometax_request` | read | 홈택스 수집 작업 요청 → jobId |
| `popbill_hometax_results` | read | 수집 상태/결과 (collecting · done · failed) |
| `popbill_list_alimtalk_templates` | read | 승인 템플릿 목록 (변수 확인용) |
| `popbill_send_alimtalk` | **write** | 알림톡 발송 (≤1,000명, SMS 대체 발송) |
| `popbill_get_alimtalk_result` | read | 발송 결과 (수신자별) |

## Setup

1. https://developers.popbill.com → API 연동 신청 → **LinkID / SecretKey** (test 연동은 즉시, 운영은 심사).
2. https://www.popbill.com 에서 사업자로 가입. 세금계산서 발행은 **공동인증서 등록**, 홈택스 수집은 **홈택스 인증서 또는 부서사용자 등록**, 알림톡은 **카카오 채널 + 템플릿 승인 + 발신번호 등록**이 각각 필요합니다 (팝빌 사이트에서 1회).
3. MCP client config:

```json
{
  "mcpServers": {
    "popbill": {
      "command": "npx",
      "args": ["-y", "@appmonster/mcp-popbill"],
      "env": {
        "POPBILL_LINK_ID": "…",
        "POPBILL_SECRET_KEY": "…",
        "POPBILL_CORP_NUM": "1234567890",
        "POPBILL_USER_ID": "myid",
        "POPBILL_TEST": "true"
      }
    }
  }
}
```

`POPBILL_TEST=true`(default) uses Popbill's test server — invoices never reach the NTS, 알림톡 never reaches phones, and every tool description is tagged `[TEST SERVER]`. Switch to `false` only with the approval hook on:

```json
"APPROVAL_URL": "https://okagent.kr",
"APPROVAL_API_KEY": "ok_…"
```

Popbill restricts API calls by IP by default (`POPBILL_IP_RESTRICT`, default on — register your IP in 팝빌 > 연동관리, or set `false` for roaming machines).

## Issuing an invoice — what the agent sends

```json
{
  "mgtKey": "INV-20261021-001",
  "writeDate": "20261021",
  "invoicer": { "corpNum": "123-45-67890", "corpName": "앱몬스터", "ceoName": "윤유성", "email": "me@appmonster.co.kr" },
  "invoicee": { "corpNum": "987-65-43210", "corpName": "거래처", "ceoName": "김대표", "email": "ap@client.co.kr" },
  "items": [{ "name": "앱 개발", "supplyCost": 3000000 }]
}
```

→ 공급가액 3,000,000 / 세액 300,000 / 합계 3,300,000, issued, emailed, NTS confirmation number returned. Pair with `kr_check_business` (public-data server) to verify the buyer's number first.

## Notes

- This package wraps the official `popbill` Node SDK (promise-ified); tests inject fakes, no network.
- 알림톡 content must match the approved template byte-for-byte after variable substitution — read it with `popbill_list_alimtalk_templates` first.
- Hometax collection is async: request → poll results. A job for 6 months of purchases typically finishes in under a minute.

## Development

```bash
pnpm --filter @appmonster/mcp-popbill test
```
