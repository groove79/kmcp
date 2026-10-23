/**
 * Import duty & tax rules for cross-border B2C parcels, by destination. Rates/thresholds as of RULES_AS_OF —
 * these change (EU €3 duty 2026-07, UK relief removal by 2028-10, JP threshold removal 2028-04, US de minimis suspended).
 * Product duty rates depend on the HS code and origin, so the caller passes dutyRate; we never invent one.
 */
export const RULES_AS_OF = "2026-10-23";

export interface Input {
  goods: number;          // goods price, destination currency
  shipping: number;       // international shipping charged, destination currency
  insurance: number;
  dutyRate: number | null; // decimal, e.g. 0.08
  itemCategories: number; // distinct product types (EU €3 per category)
  origin?: string;        // ISO2
  consumer: boolean;
  date: string;           // yyyy-MM-dd, for dated rules
  vatRate?: number;       // override (e.g. Canada HST province, EU member state)
}
export interface Line { label: string; amount: number; note?: string }
export interface Result { lines: Line[]; duty: number | null; tax: number; collectedAtCheckout: boolean; exemptions: string[]; warnings: string[]; sources: string[] }

export interface Rule { currency: string; name: string; taxName: string; defaultVat: number; calc: (i: Input, vat: number) => Result }

const r2 = (n: number) => Math.round(n * 100) / 100;
const needDuty = (i: Input, w: string[]) => { if (i.dutyRate === null) w.push("Duty rate not given: product duty depends on the HS code and origin. Pass dutyRate (e.g. 0.08) for a full total."); return i.dutyRate ?? 0; };

export const EU_VAT: Record<string, number> = {
  AT: 0.20, BE: 0.21, BG: 0.20, HR: 0.25, CY: 0.19, CZ: 0.21, DK: 0.25, EE: 0.24, FI: 0.255, FR: 0.20, DE: 0.19, GR: 0.24, HU: 0.27, IE: 0.23,
  IT: 0.22, LV: 0.21, LT: 0.21, LU: 0.17, MT: 0.18, NL: 0.21, PL: 0.23, PT: 0.23, RO: 0.21, SK: 0.23, SI: 0.22, ES: 0.21, SE: 0.25,
};

const euRule = (cc: string): Rule => ({
  currency: "EUR", name: `EU (${cc})`, taxName: "VAT", defaultVat: EU_VAT[cc],
  calc: (i, vat) => {
    const w: string[] = [], ex: string[] = [], lines: Line[] = [];
    const base = i.goods + i.shipping + i.insurance;
    if (i.goods <= 150 && i.consumer) {
      const tax = vat * base;
      lines.push({ label: `VAT ${r2(vat * 100)}% (IOSS, charged at checkout)`, amount: tax });
      let duty = 0;
      if (i.date >= "2026-07-01" && i.date < "2028-07-01") { duty = 3 * Math.max(1, i.itemCategories); lines.push({ label: `Customs duty €3 × ${Math.max(1, i.itemCategories)} item categor${i.itemCategories > 1 ? "ies" : "y"}`, amount: duty, note: "Flat EU duty on ≤€150 parcels from 1 Jul 2026; normal rates from 1 Jul 2028." }); }
      else if (i.date >= "2028-07-01") { duty = needDuty(i, w) * base; lines.push({ label: "Customs duty (normal rate)", amount: duty }); }
      else ex.push("≤€150 customs duty relief (before 1 Jul 2026)");
      w.push("A per-parcel EU handling fee is planned; not included.");
      return { lines, duty, tax, collectedAtCheckout: true, exemptions: ex, warnings: w, sources: ["https://www.pwc.dk/en/articles-publications/2026/eu-abolishes-the-150-low-value-customs-duty-threshold-from-1-july-2026.html", "https://taxation-customs.ec.europa.eu/taxation/vat/vat-e-commerce_en"] };
    }
    const duty = needDuty(i, w) * base;
    const tax = vat * (base + duty);
    lines.push({ label: "Customs duty", amount: duty }, { label: `Import VAT ${r2(vat * 100)}%`, amount: tax });
    if (!i.consumer) w.push("Business buyers can usually reclaim import VAT.");
    return { lines, duty: i.dutyRate === null ? null : duty, tax, collectedAtCheckout: false, exemptions: ex, warnings: w, sources: ["https://taxation-customs.ec.europa.eu/customs-4/calculation-customs-duties_en"] };
  },
});

export const RULES: Record<string, Rule> = {
  US: {
    currency: "USD", name: "United States", taxName: "(no federal import VAT)", defaultVat: 0,
    calc: (i) => {
      const w: string[] = ["De minimis ($800 duty-free) is suspended for all origins (postal and courier); statutory repeal from 1 Jul 2027.", "Additional country-specific tariffs can apply on top of the HTS rate — include them in dutyRate. State sales tax is not collected at the border.", "Carrier brokerage/entry fees not included."];
      const duty = needDuty(i, w) * i.goods; // US customs value excludes international freight
      return { lines: [{ label: "Customs duty (on goods value, freight excluded)", amount: duty }], duty: i.dutyRate === null ? null : duty, tax: 0, collectedAtCheckout: false, exemptions: [], warnings: w, sources: ["https://www.cbp.gov/trade/trade-enforcement/tftea/de-minimis"] };
    },
  },
  GB: {
    currency: "GBP", name: "United Kingdom", taxName: "VAT", defaultVat: 0.20,
    calc: (i, vat) => {
      const w: string[] = [];
      const base = i.goods + i.shipping + i.insurance;
      if (i.goods <= 135) {
        w.push("Low-value import duty relief is planned to end by October 2028.");
        return { lines: [{ label: `VAT ${r2(vat * 100)}% charged by the seller at checkout`, amount: vat * base }], duty: 0, tax: vat * base, collectedAtCheckout: true, exemptions: ["≤£135: no customs duty (LVI relief)"], warnings: w, sources: ["https://www.gov.uk/guidance/vat-and-overseas-goods-sold-directly-to-customers-in-the-uk", "https://globalimportblog.bakermckenzie.com/2026/07/24/uk-low-value-import-relief-to-be-removed-by-october-2028/"] };
      }
      const duty = needDuty(i, w) * base, tax = vat * (base + duty);
      return { lines: [{ label: "Customs duty", amount: duty }, { label: `Import VAT ${r2(vat * 100)}%`, amount: tax }], duty: i.dutyRate === null ? null : duty, tax, collectedAtCheckout: false, exemptions: [], warnings: w, sources: ["https://www.gov.uk/goods-sent-from-abroad/tax-and-duty"] };
    },
  },
  JP: {
    currency: "JPY", name: "Japan", taxName: "Consumption tax", defaultVat: 0.10,
    calc: (i, vat) => {
      const w: string[] = [];
      const value = i.consumer ? 0.6 * i.goods : i.goods + i.shipping + i.insurance; // personal-use: 60% of overseas retail price
      if (i.consumer && value <= 10000) {
        w.push("The ¥10,000 exemption is set to end on 1 Apr 2028 (2026 tax reform).");
        return { lines: [], duty: 0, tax: 0, collectedAtCheckout: false, exemptions: [`Taxable value ¥${Math.round(value)} (60% of price) ≤ ¥10,000: duty and consumption tax exempt`], warnings: w, sources: ["https://www.customs.go.jp/tsukan/kojin_yunyu.htm", "https://www.vatcalc.com/japan/japan-consumption-tax-low-value-consignment-threshold/"] };
      }
      const duty = needDuty(i, w) * value, tax = vat * (value + duty);
      return { lines: [{ label: i.consumer ? "Customs duty (on 60% of price — personal use)" : "Customs duty", amount: duty }, { label: "Consumption tax 10%", amount: tax }], duty: i.dutyRate === null ? null : duty, tax, collectedAtCheckout: false, exemptions: [], warnings: w, sources: ["https://www.customs.go.jp/tsukan/kojin_yunyu.htm"] };
    },
  },
  KR: {
    currency: "KRW", name: "South Korea", taxName: "VAT", defaultVat: 0.10,
    calc: () => { throw new Error("use koreaCalc"); },
  },
  AU: {
    currency: "AUD", name: "Australia", taxName: "GST", defaultVat: 0.10,
    calc: (i, vat) => {
      const w: string[] = [];
      if (i.goods <= 1000) return { lines: [{ label: "GST 10% charged by the seller at checkout", amount: vat * (i.goods + i.shipping) }], duty: 0, tax: vat * (i.goods + i.shipping), collectedAtCheckout: true, exemptions: ["≤A$1,000: no duty or border GST (low value imported goods)"], warnings: w, sources: ["https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-on-imported-goods-and-services/gst-on-low-value-imported-goods"] };
      const duty = needDuty(i, w) * i.goods, tax = vat * (i.goods + duty + i.shipping + i.insurance);
      w.push("Import processing charges not included.");
      return { lines: [{ label: "Customs duty (on goods value)", amount: duty }, { label: "GST 10%", amount: tax }], duty: i.dutyRate === null ? null : duty, tax, collectedAtCheckout: false, exemptions: [], warnings: w, sources: ["https://www.abf.gov.au/importing-exporting-and-manufacturing/importing/cost-of-importing-goods"] };
    },
  },
  CA: {
    currency: "CAD", name: "Canada", taxName: "GST/HST", defaultVat: 0.05,
    calc: (i, vat) => {
      const w: string[] = ["Default 5% GST; pass vatRate for HST provinces (ON 13%, NS 14%, NB/NL/PE 15%) or GST+PST.", "Courier brokerage fees not included."];
      const cusma = i.origin === "US" || i.origin === "MX";
      const dutyFree = cusma ? 150 : 20, taxFree = cusma ? 40 : 20;
      const ex: string[] = [];
      let duty = 0, tax = 0;
      if (i.goods > dutyFree) duty = needDuty(i, w) * i.goods; else ex.push(`≤C$${dutyFree}: duty-free${cusma ? " (CUSMA courier)" : ""}`);
      if (i.goods > taxFree) tax = vat * (i.goods + duty); else ex.push(`≤C$${taxFree}: tax-free`);
      return { lines: [{ label: "Customs duty", amount: duty }, { label: "GST/HST", amount: tax }], duty: i.goods > dutyFree && i.dutyRate === null ? null : duty, tax, collectedAtCheckout: false, exemptions: ex, warnings: w, sources: ["https://www.cbsa-asfc.gc.ca/services/cusma-aceum/lvs-efv-eng.html"] };
    },
  },
  CN: {
    currency: "CNY", name: "China (cross-border e-commerce retail import)", taxName: "VAT", defaultVat: 0.13,
    calc: (i, vat) => {
      const w: string[] = ["Consumption tax (cosmetics, jewellery, etc.) not included.", "Annual personal CBEC quota ¥26,000."];
      const base = i.goods + i.shipping + i.insurance;
      if (base <= 5000) {
        const tax = vat * 0.7 * base;
        return { lines: [{ label: `CBEC import VAT (13% × 70%)`, amount: tax }], duty: 0, tax, collectedAtCheckout: true, exemptions: ["≤¥5,000 per order via CBEC platforms: duty 0%, VAT at 70%"], warnings: w, sources: ["http://www.customs.gov.cn/"] };
      }
      const duty = needDuty(i, w) * base, tax = vat * (base + duty);
      return { lines: [{ label: "Customs duty (general trade)", amount: duty }, { label: "Import VAT 13%", amount: tax }], duty: i.dutyRate === null ? null : duty, tax, collectedAtCheckout: false, exemptions: [], warnings: w, sources: ["http://www.customs.gov.cn/"] };
    },
  },
  SG: {
    currency: "SGD", name: "Singapore", taxName: "GST", defaultVat: 0.09,
    calc: (i, vat) => {
      const base = i.goods + i.shipping + i.insurance;
      if (i.goods <= 400) return { lines: [{ label: "GST 9% charged by the seller at checkout (OVR)", amount: vat * base }], duty: 0, tax: vat * base, collectedAtCheckout: true, exemptions: ["≤S$400 low-value goods: no border GST; most goods have no duty"], warnings: [], sources: ["https://www.iras.gov.sg/taxes/goods-services-tax-(gst)/gst-and-digital-economy/low-value-goods"] };
      const w: string[] = ["Most goods have no customs duty (except liquor, tobacco, motor vehicles, petroleum)."];
      const duty = (i.dutyRate ?? 0) * base, tax = vat * (base + duty);
      return { lines: [{ label: "Customs duty", amount: duty }, { label: "Import GST 9%", amount: tax }], duty, tax, collectedAtCheckout: false, exemptions: [], warnings: w, sources: ["https://www.customs.gov.sg/businesses/valuation-duties-taxes-fees/goods-and-services-tax-gst/"] };
    },
  },
};
for (const cc of Object.keys(EU_VAT)) RULES[cc] = euRule(cc);

/** Korea needs the goods price in USD for its threshold ($150, $200 from the US). */
export function koreaCalc(i: Input, vat: number, goodsUsd: number): Result {
  const limit = i.origin === "US" ? 200 : 150;
  const w: string[] = [];
  if (i.consumer && goodsUsd <= limit) return { lines: [], duty: 0, tax: 0, collectedAtCheckout: false, exemptions: [`Personal use, goods ≤ US$${limit}${i.origin === "US" ? " (from the US)" : ""}: duty and VAT exempt (목록/간이통관)`], warnings: ["Several orders arriving the same day may be combined (합산과세)."], sources: ["https://www.customs.go.kr/"] };
  const base = i.goods + i.shipping + i.insurance;
  const duty = needDuty(i, w) * base, tax = vat * (base + duty);
  if (i.dutyRate === null) w.push("Common Korean rates: most goods 8%, clothing/shoes 13%, electronics often 0–8%.");
  return { lines: [{ label: "Customs duty (관세, on CIF)", amount: duty }, { label: "VAT 10% (부가세)", amount: tax }], duty: i.dutyRate === null ? null : duty, tax, collectedAtCheckout: false, exemptions: [], warnings: w, sources: ["https://www.customs.go.kr/"] };
}
