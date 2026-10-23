---
name: korean-parcel-tracking
description: Use when someone wants to know where a parcel is — 택배 배송조회, 운송장 조회 for CJ대한통운, 우체국, 한진, 롯데, 로젠, 쿠팡 and international carriers such as DHL, UPS and Yamato — or to check several shipments at once and find stuck ones.
---

# Parcel tracking

## Tools
- `delivery_track_parcel { carrier, trackingNumber }` — status, last event, full history (KST).
- `delivery_track_many { parcels: [{ carrier, trackingNumber, ref? }] }` — up to 5 at a time on the hosted server; returns a summary (delivered / in transit / needs attention).
- `delivery_list_carriers { searchText? }` — when the carrier name is unclear.

Carrier can be written in Korean or English ("CJ", "대한통운", "우체국", "kr.hanjin"). Hyphens and spaces in the number are ignored.

## How to answer
1. If the user gives only a number, ask for the carrier — or try the most likely domestic carriers one at a time and say which one matched.
2. Lead with the status in plain words ("배송 출발 — 오늘 도착 예정 지역 ○○"), then the latest 3–5 events with times.
3. Flag `needsAttention` (배송실패, 장기 미이동) and suggest the next step (기사·고객센터 연락, 반송 확인).
4. Tracking data comes from the carriers via Delivery Tracker and can lag by a few hours.
