/**
 * Cross-border landed cost: duty + import VAT/GST for B2C parcels into major markets. Read-only.
 * FX: open.er-api.com (mid-market, daily). Rules: rules.ts (dated, sourced).
 */
import { z } from "zod";
import { RULES, RULES_AS_OF, EU_VAT, koreaCalc, type Input } from "./rules.js";

export type Access = "read" | "write";
export interface Ctx { fetchImpl: typeof fetch }
export interface ToolDef<S extends z.ZodRawShape> {
  name: string; description: string; access: Access; schema: S;
  handler: (ctx: Ctx, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}
const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t;
const r2 = (n: number) => Math.round(n * 100) / 100;

export const DESTINATIONS = Object.keys(RULES).sort();

async function fx(ctx: Ctx, from: string, to: string): Promise<{ rate: number; asOf: string | null }> {
  if (from === to) return { rate: 1, asOf: null };
  const res = await ctx.fetchImpl(`https://open.er-api.com/v6/latest/${from}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`FX lookup failed (HTTP ${res.status}). Pass fxRate to skip it.`);
  const j = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
  const rate = j.rates?.[to];
  if (j.result !== "success" || !rate) throw new Error(`No FX rate ${from}→${to}. Pass fxRate.`);
  return { rate, asOf: j.time_last_update_utc ?? null };
}

export const landedCost = define({
  name: "landed_cost",
  access: "read",
  description:
    "Estimate what a buyer pays to import a parcel: goods + shipping + customs duty + import VAT/GST, for US, UK, EU (27 states), Japan, Korea, China, Australia, Canada and Singapore. " +
    "Applies current de minimis rules (EU €3 duty on ≤€150 parcels from Jul 2026, US de minimis suspended, UK ≤£135, Japan ¥10,000, Korea $150/$200, AU A$1,000…) and says what is collected at checkout. " +
    "Duty rates depend on the product's HS code — pass dutyRate when known.",
  schema: {
    destination: z.string().regex(/^[A-Za-z]{2}$/).describe("Destination country ISO2: US, GB, DE, FR, JP, KR, CN, AU, CA, SG, any EU member"),
    origin: z.string().regex(/^[A-Za-z]{2}$/).optional().describe("Origin country ISO2 (matters for Canada CUSMA, Korea US threshold)"),
    goodsValue: z.number().positive().max(1e9).describe("Price of the goods"),
    shipping: z.number().min(0).max(1e9).default(0).describe("International shipping charged"),
    insurance: z.number().min(0).max(1e9).default(0),
    currency: z.string().regex(/^[A-Za-z]{3}$/).default("USD").describe("Currency of goodsValue/shipping (ISO 4217)"),
    dutyRate: z.number().min(0).max(5).optional().describe("Product duty rate as a decimal (0.08 = 8%) incl. any extra tariffs. Omit if unknown."),
    itemCategories: z.number().int().min(1).max(50).default(1).describe("Number of distinct product types in the parcel (EU flat duty is per category)"),
    buyer: z.enum(["consumer", "business"]).default("consumer"),
    vatRate: z.number().min(0).max(0.5).optional().describe("Override VAT/GST rate (e.g. Canadian HST 0.13)"),
    fxRate: z.number().positive().optional().describe("Units of destination currency per 1 unit of currency (skip live FX)"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Import date for dated rules (default today)"),
  },
  handler: async (ctx, a) => {
    const cc = a.destination.toUpperCase();
    const rule = RULES[cc];
    if (!rule) throw new Error(`Destination ${cc} not covered. Covered: ${DESTINATIONS.join(", ")}.`);
    const cur = a.currency.toUpperCase();
    const { rate, asOf } = a.fxRate ? { rate: a.fxRate, asOf: "given" } : await fx(ctx, cur, rule.currency);
    const date = a.date ?? new Date().toISOString().slice(0, 10);
    const input: Input = {
      goods: a.goodsValue * rate, shipping: a.shipping * rate, insurance: a.insurance * rate,
      dutyRate: a.dutyRate ?? null, itemCategories: a.itemCategories, origin: a.origin?.toUpperCase(), consumer: a.buyer === "consumer", date, vatRate: a.vatRate,
    };
    const vat = a.vatRate ?? rule.defaultVat;
    let res;
    if (cc === "KR") {
      const usd = cur === "USD" ? a.goodsValue : (await fx(ctx, cur, "USD")).rate * a.goodsValue;
      res = koreaCalc(input, vat, usd);
    } else res = rule.calc(input, vat);
    const charges = res.lines.reduce((n, l) => n + l.amount, 0);
    const total = input.goods + input.shipping + input.insurance + charges;
    const back = (n: number) => r2(n / rate);
    return {
      destination: `${rule.name}`, currency: rule.currency, fx: { from: cur, to: rule.currency, rate, asOf },
      goods: r2(input.goods), shipping: r2(input.shipping + input.insurance),
      charges: res.lines.map((l) => ({ ...l, amount: r2(l.amount) })),
      dutyKnown: res.duty !== null,
      totalLandedCost: r2(total), totalInOriginalCurrency: back(total), currencyOriginal: cur,
      collectedAtCheckout: res.collectedAtCheckout,
      exemptions: res.exemptions, warnings: res.warnings,
      rulesAsOf: RULES_AS_OF, sources: res.sources,
      disclaimer: "Estimate. Customs uses its own exchange rate and valuation; carrier fees, excise and anti-dumping duties are not included.",
    };
  },
});

export const landedCostRules = define({
  name: "landed_cost_rules",
  access: "read",
  description: "Show the import tax rules used for a destination (or all): currency, VAT/GST rate, de minimis thresholds and upcoming changes, with sources and the date they were last checked.",
  schema: { destination: z.string().regex(/^[A-Za-z]{2}$/).optional() },
  handler: async (_ctx, a) => {
    const summary: Record<string, string> = {
      US: "No de minimis (suspended indefinitely from 2026; statutory repeal 1 Jul 2027). Duty on goods value at HTS rate + additional tariffs. No federal VAT.",
      GB: "VAT 20%. ≤£135: VAT at checkout, no duty (relief to be removed by Oct 2028). >£135: duty + import VAT.",
      JP: "Consumption tax 10%. Personal use: taxable value = 60% of price; ≤¥10,000 exempt (until 1 Apr 2028).",
      KR: "VAT 10%. Personal use ≤US$150 (US$200 from US) exempt. Above: duty on CIF + VAT.",
      CN: "CBEC retail import ≤¥5,000/order: duty 0, VAT 13%×70%. Above: general trade.",
      AU: "GST 10%. ≤A$1,000: GST at checkout, no duty. Above: duty + GST at border.",
      CA: "GST 5% (+PST/HST by province). Duty-free ≤C$20 (C$150 CUSMA courier), tax-free ≤C$20 (C$40 CUSMA).",
      SG: "GST 9%. ≤S$400: GST at checkout (OVR). Most goods duty-free.",
      EU: "VAT by member state. ≤€150: VAT at checkout (IOSS) + €3 duty per item category (1 Jul 2026–30 Jun 2028), then normal duty. >€150: duty + import VAT.",
    };
    const pick = a.destination?.toUpperCase();
    if (pick) {
      const r = RULES[pick];
      if (!r) throw new Error(`Not covered: ${pick}`);
      return { destination: pick, name: r.name, currency: r.currency, tax: `${r.taxName} ${Math.round(r.defaultVat * 1000) / 10}%`, rules: summary[EU_VAT[pick] !== undefined ? "EU" : pick], asOf: RULES_AS_OF };
    }
    return { asOf: RULES_AS_OF, destinations: DESTINATIONS, rules: summary, euVatRates: EU_VAT };
  },
});

export const tools = [landedCost, landedCostRules] as const;
