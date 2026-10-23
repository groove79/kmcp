---
name: korean-tax-deadlines
description: Use when someone asks when Korean taxes or payroll filings are due — 부가세 신고 기간, 원천세, 종합소득세, 법인세, 4대보험 납부일, 지급명세서, 연말정산 — or "이번 달 신고할 것", or wants reminders or cash planning around those dates.
---

# Korean tax & payroll deadlines

Statutory dates move to the next business day when they fall on a weekend or holiday. Use the tool so the shifted date is right.

## Tool
`kr_tax_calendar { year?, entity, employees, withholdingHalfYear?, month?, upcomingDays? }`
- `entity`: `individual` (개인 일반과세), `simplified` (간이과세), `corporation` (법인, 12월 결산), `taxfree` (면세).
- `employees: true` adds 원천세, 4대보험, 지급명세서. Ask if they pay anyone (직원, 아르바이트, 프리랜서 3.3%).
- `upcomingDays: 30` for "곧 할 것", `month` for one month.
`kr_tax_rule { id }` explains one item (who files, what period, base date). Without `id` it lists all items.

## How to answer
1. If the business type is unknown, ask one short question (개인/간이/법인, 직원 유무) — or show the general 개인 일반과세 schedule and say so.
2. Answer as a list: 날짜(요일) — 항목 — 대상 기간. Mark dates that were shifted ("원래 1/25 일요일 → 1/26").
3. Add the days left from today (KST) for anything within 30 days.
4. This is schedule information, not tax advice. For amounts or special cases (예정고지, 성실신고확인, 결산월이 12월이 아닌 법인) suggest confirming with 홈택스 or a 세무사.
