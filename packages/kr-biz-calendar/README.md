# @appmonster/mcp-kr-biz-calendar

MCP server for **Korean business dates** — no keys, no network. An agent gets:

- **Public holidays** with computed 대체공휴일 and election days (2025–2028 lunar table built in)
- **Business-day math**: "3 영업일 후", count business days between dates, next/previous business day
- **Tax & payroll calendar** per business profile: 부가세 확정·예정, 종합소득세, 법인세, 원천세·4대보험 매월 10일, 지급명세서, 연말정산 — each moved to the next business day when it lands on a holiday (국세기본법 §5)

한국 사업자용 세무·노무 일정과 영업일 계산. 키 없이 바로 동작.

## Tools

| Tool | What it does |
|---|---|
| `kr_list_holidays` | 연도별 공휴일 (대체공휴일·선거일 포함) |
| `kr_is_business_day` | 영업일 여부 + 다음/이전 영업일 |
| `kr_add_business_days` | 영업일 더하기/빼기, 두 날짜 사이 영업일 수 |
| `kr_tax_calendar` | 사업자 유형(개인·간이·법인·면세)·고용 여부별 신고 일정, 월/다가오는 N일 필터 |
| `kr_tax_rule` | 일정 항목 설명 (무엇을, 누가, 언제) |

## Setup

```json
{ "mcpServers": { "kr-biz-calendar": { "command": "npx", "args": ["-y", "@appmonster/mcp-kr-biz-calendar"] } } }
```

## Examples

- "이번 달 우리 회사가 신고할 거 뭐 있어?" → `kr_tax_calendar {entity: "corporation", employees: true, month: 10}`
- "오늘 발송하면 영업일 3일 뒤 도착 — 언제?" → `kr_add_business_days {days: 3}`
- "1/25가 일요일인데 부가세 언제까지?" → calendar already returns `2026-01-26 (shifted)`

## Coverage & accuracy

- Lunar holidays (설날·추석·부처님오신날) are tabled for 2025–2028. For other years pass `extraHolidays` from the public-data server's `kr_holidays` (official KASI data); the tools say so in `note`.
- Substitute-holiday rules follow the 2023 amendment (all holidays except 신정·현충일; overlaps count).
- Deadlines encode standard rules for a 12월 결산 법인 and calendar-year individuals. Special regimes (성실신고확인, 반기납부, 수정신고) are noted in `what`, not computed. Always confirm with 홈택스 notices; this is a scheduling aid, not tax advice.

## Development

```bash
pnpm --filter @appmonster/mcp-kr-biz-calendar test
```
