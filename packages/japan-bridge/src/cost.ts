/**
 * JPY → KRW landed cost and selling-price calculator for 일본구매대행 (buying-agent) listings.
 *
 * Korean import rules applied (as of 2026; all adjustable through the inputs):
 *  - 소액면세 (de minimis): if the goods value (FOB, per shipment) is ≤ USD 150 → 목록통관, no duty, no VAT.
 *    (USD 200 when shipped from the US — not our case, but exposed as `dutyFreeUsd`.)
 *  - Above the threshold the whole shipment is taxed:
 *      simple mode  (간이세율, 특송/우편 default): tax = taxable × simpleRate  (default 20%, covers duty + VAT)
 *      general mode (일반세율):                     duty = taxable × dutyRate ; vat = (taxable + duty) × 10%
 *    taxable (과세가격) = goods + international shipping + insurance, in KRW at the customs rate.
 *  - Selling price = total cost ÷ (1 − platformFee − targetMargin), rounded up to 100 KRW.
 * Pure function: no network. FX and shipping are inputs so the numbers are reproducible.
 */
export interface CostInput {
  priceJpy: number;
  quantity?: number;
  /** total parcel weight in kg (used only when shippingJpy is not given) */
  weightKg?: number;
  /** international shipping for the whole parcel, JPY. Overrides the base + per-kg estimate. */
  shippingJpy?: number;
  shippingBaseJpy?: number;
  shippingPerKgJpy?: number;
  /** domestic JP shipping to the forwarder, JPY (0 when 送料無料) */
  domesticShippingJpy?: number;
  /** KRW per 1 JPY, e.g. 9.1 */
  jpyToKrw: number;
  /** KRW per 1 USD, e.g. 1380 — for the de minimis check */
  usdToKrw: number;
  dutyFreeUsd?: number;
  taxMode?: "simple" | "general";
  simpleRate?: number;
  dutyRate?: number;
  vatRate?: number;
  /** marketplace commission + PG fee as a fraction of the selling price */
  platformFeeRate?: number;
  /** desired margin as a fraction of the selling price */
  targetMarginRate?: number;
  /** extra KRW per order (packaging, local delivery) */
  extraKrw?: number;
}

export interface CostResult {
  inputs: Required<Omit<CostInput, "shippingJpy" | "weightKg">> & { shippingJpy: number; weightKg: number | null };
  goodsKrw: number;
  shippingKrw: number;
  goodsUsd: number;
  dutyFree: boolean;
  taxableKrw: number;
  dutyKrw: number;
  vatKrw: number;
  taxKrw: number;
  landedCostKrw: number;
  landedCostPerUnitKrw: number;
  suggestedPriceKrw: number;
  feeKrw: number;
  marginKrw: number;
  breakEvenPriceKrw: number;
  notes: string[];
}

const r0 = (n: number) => Math.round(n);

export function landedCost(i: CostInput): CostResult {
  const quantity = i.quantity ?? 1;
  const shippingBaseJpy = i.shippingBaseJpy ?? 700;
  const shippingPerKgJpy = i.shippingPerKgJpy ?? 1500;
  const weightKg = i.weightKg ?? null;
  const shippingJpy = i.shippingJpy ?? shippingBaseJpy + shippingPerKgJpy * (weightKg ?? 1);
  const domesticShippingJpy = i.domesticShippingJpy ?? 0;
  const dutyFreeUsd = i.dutyFreeUsd ?? 150;
  const taxMode = i.taxMode ?? "simple";
  const simpleRate = i.simpleRate ?? 0.2;
  const dutyRate = i.dutyRate ?? 0.08;
  const vatRate = i.vatRate ?? 0.1;
  const platformFeeRate = i.platformFeeRate ?? 0.06;
  const targetMarginRate = i.targetMarginRate ?? 0.2;
  const extraKrw = i.extraKrw ?? 0;
  const notes: string[] = [];

  const goodsJpy = i.priceJpy * quantity + domesticShippingJpy;
  const goodsKrw = r0(goodsJpy * i.jpyToKrw);
  const shippingKrw = r0(shippingJpy * i.jpyToKrw);
  const goodsUsd = (goodsJpy * i.jpyToKrw) / i.usdToKrw;
  const dutyFree = goodsUsd <= dutyFreeUsd;

  let dutyKrw = 0, vatKrw = 0;
  const taxableKrw = goodsKrw + shippingKrw;
  if (dutyFree) {
    notes.push(`목록통관: 물품가 USD ${goodsUsd.toFixed(2)} ≤ ${dutyFreeUsd} → 관세·부가세 면제`);
  } else if (taxMode === "simple") {
    const tax = r0(taxableKrw * simpleRate);
    dutyKrw = tax; // 간이세율 bundles duty + VAT; reported under dutyKrw, vat 0
    notes.push(`과세: USD ${goodsUsd.toFixed(2)} > ${dutyFreeUsd}. 간이세율 ${(simpleRate * 100).toFixed(0)}% × 과세가격(물품+운송) ${taxableKrw.toLocaleString("ko-KR")}원`);
  } else {
    dutyKrw = r0(taxableKrw * dutyRate);
    vatKrw = r0((taxableKrw + dutyKrw) * vatRate);
    notes.push(`과세: 관세 ${(dutyRate * 100).toFixed(1)}% + 부가세 ${(vatRate * 100).toFixed(0)}%`);
  }
  const taxKrw = dutyKrw + vatKrw;
  const landedCostKrw = goodsKrw + shippingKrw + taxKrw + extraKrw;
  const denom = 1 - platformFeeRate - targetMarginRate;
  if (denom <= 0) throw new Error("platformFeeRate + targetMarginRate must be < 1");
  const rawPrice = landedCostKrw / denom;
  const suggestedPriceKrw = Math.ceil(rawPrice / 100) * 100;
  const feeKrw = r0(suggestedPriceKrw * platformFeeRate);
  const marginKrw = suggestedPriceKrw - feeKrw - landedCostKrw;
  const breakEvenPriceKrw = Math.ceil(landedCostKrw / (1 - platformFeeRate) / 100) * 100;
  if (!dutyFree && quantity > 1) notes.push("수량을 나눠 보내면 건당 USD 150 이하로 목록통관이 될 수 있음 (합산과세 주의: 같은 날 같은 수취인 입항분은 합산)");
  if (weightKg === null && i.shippingJpy === undefined) notes.push("무게 미입력 → 1kg 기준 배송비 추정");

  return {
    inputs: { priceJpy: i.priceJpy, quantity, weightKg, shippingJpy, shippingBaseJpy, shippingPerKgJpy, domesticShippingJpy, jpyToKrw: i.jpyToKrw, usdToKrw: i.usdToKrw, dutyFreeUsd, taxMode, simpleRate, dutyRate, vatRate, platformFeeRate, targetMarginRate, extraKrw },
    goodsKrw, shippingKrw, goodsUsd: Math.round(goodsUsd * 100) / 100, dutyFree, taxableKrw, dutyKrw, vatKrw, taxKrw,
    landedCostKrw, landedCostPerUnitKrw: r0(landedCostKrw / quantity), suggestedPriceKrw, feeKrw, marginKrw, breakEvenPriceKrw, notes,
  };
}
