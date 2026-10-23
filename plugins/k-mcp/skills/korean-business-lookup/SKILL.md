---
name: korean-business-lookup
description: Use to check Korean business registration numbers (사업자등록번호 휴업·폐업·과세유형 조회), to search or normalize Korean addresses (도로명주소, 지번, 우편번호, 영문주소 확인), or to look up apartment sale prices (아파트 실거래가) for a district and month.
---

# Business status, addresses, apartment prices

## Tools
- `kr_check_business { numbers: [...] }` — National Tax Service status for up to 100 numbers: 계속사업자 / 휴업 / 폐업, 과세유형, 폐업일. Dashes are fine. Every 10 numbers count 1 call.
- `kr_search_address { keyword, count? }` — road address, lot address, postal code, building name, admin code. Keyword like "테헤란로 152" or a building name.
- `kr_apt_trades { lawd_cd, year_month, apartment? }` — MOLIT apartment sale records. `lawd_cd` is the 5-digit district code: get it from `kr_search_address` (first 5 digits of the admin code) when the user names a place.

## How to answer
1. Business check: show 번호 · 상태 · 과세유형 · 폐업일 as a table. Flag 폐업/휴업 clearly — the user is usually deciding whether to trade with or invoice that business.
2. Address: give the road address and postal code first; if several match, list the top few and ask which one.
3. Apartment prices: name the district and month, then list 단지 · 전용면적(㎡) · 층 · 거래금액(만원) · 계약일. Summaries (median, range) must be computed from the returned rows. Data appears with a delay of up to ~30 days after a contract; say so for the latest month.
4. These are public records. Do not combine them to profile a private individual.
