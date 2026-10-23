---
name: korean-holidays-business-days
description: Use for any question about Korean public holidays (공휴일, 대체공휴일, 임시공휴일, 설날·추석 연휴), whether a date is a business day (영업일), or date math that must skip Korean weekends and holidays — delivery ETAs, payment or contract deadlines, "N영업일 후", counting working days between two dates.
---

# Korean holidays & business days

Korean holiday rules change (노동절 and 제헌절 became public holidays in 2026; 설·추석 get a substitute only when they hit a Sunday or another holiday, the other holidays also on Saturdays). Never answer from memory — call the tools.

## Tools (k-mcp server)
- `kr_list_holidays { year }` — every holiday of a year with 대체공휴일 and election days. Offline, fast.
- `kr_is_business_day { date }` — is it a business day, which holiday, next/previous business day.
- `kr_add_business_days { from, days }` — add or subtract N business days. `{ from, to }` counts business days between two dates (max 10 years).
- `kr_holidays { year, month }` — the official KASI (천문연) list from data.go.kr. Use it to double-check, or for years outside 2025–2028 where lunar dates are not tabled offline (the offline tools say so in a `note`). Always pass `month` when you can — a whole year costs 12 calls of the user's daily allowance.

## How to answer
1. Dates are KST. If the user says "오늘", "다음 주 금요일", resolve to `yyyy-MM-dd` first and say which date you used.
2. For "언제 쉬어?" give a compact table: 날짜 · 요일 · 이름, and mark 대체공휴일 clearly.
3. For deadlines, show the calculation: start date → N business days → result, and name the holidays that were skipped.
4. If a tool returns a `note` about missing lunar data, call `kr_holidays` for that year and pass the result as `extraHolidays`.
5. Company-specific days off (창립기념일, 여름휴가) are not public holidays — ask, then pass them as `extraHolidays`.
