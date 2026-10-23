---
name: japan-import-cost
description: Use for Japan-to-Korea purchases — 일본 직구 관부가세 계산, 엔화 환율, 배송대행 포함 총비용, 면세 한도(150달러) 판단, or pricing an item for 해외구매대행 resale on Naver Smart Store.
---

# Japan import cost (일본 직구·구매대행)

## Tools
- `jp_fx_rate {}` — current JPY→KRW and USD→KRW mid-market rates.
- `jp_landed_cost { priceJpy, jpyToKrw, usdToKrw, quantity?, weightKg?, shippingJpy?, domesticShippingJpy?, taxMode?, dutyRate?, targetMarginRate?, platformFeeRate? }` — landed cost with every step explained: conversion, forwarder shipping, USD 150 duty-free check, 간이세율 20% (`taxMode: "simple"`) or duty + VAT (`"general"`, give `dutyRate` by HS code: 의류 13%, 일반 8%), fees, suggested selling price.
- `jp_listing_draft { item, titleKo, descriptionKo, sellPriceKrw }` — a Smart Store listing draft with the 해외구매대행 notices Korean law requires. Nothing is posted.

## How to answer
1. Get rates with `jp_fx_rate` first unless the user gave rates.
2. Run `jp_landed_cost` and present a short breakdown: 상품가 → 원화 → 배송비 → 관부가세 → 합계, plus whether it is under the duty-free limit.
3. Say clearly that customs uses its own weekly rate and the real duty is decided at clearance; this is an estimate.
4. For resale pricing, show margin at the suggested price and one alternative price. If they want a listing, write a Korean title (≤100자) and description, then call `jp_listing_draft`.
