# Cross-border Landed Cost MCP

"What will my customer actually pay?" — goods + shipping + customs duty + import VAT/GST for B2C parcels into **the US, UK, all 27 EU states, Japan, Korea, China, Australia, Canada and Singapore**, using the de minimis rules in force on the import date:

- EU: VAT at checkout (IOSS) for ≤€150, plus the **€3 duty per item category from 1 July 2026** (normal rates from July 2028)
- US: **no de minimis** (suspended; statutory repeal July 2027) — duty on goods value
- UK ≤£135, Japan ¥10,000 (60% personal-use rule), Korea US$150/200, China CBEC ¥5,000, Australia A$1,000, Canada CUSMA, Singapore S$400

```bash
npx -y @appmonster/mcp-landed-cost
```

Hosted (no install): `https://okagent.kr/api/mcp` · REST `https://okagent.kr/api/tools`.

| Tool | What it does |
|---|---|
| `landed_cost` | Full breakdown in destination currency and yours, what is collected at checkout, exemptions, warnings, sources |
| `landed_cost_rules` | The rules and rates used, with the date they were last checked |

Product duty rates depend on the HS code and origin (and US additional tariffs), so pass `dutyRate` when you know it — the tool never invents one and tells you when it is missing. FX: open.er-api.com mid-market (or pass `fxRate`). Estimates only: customs uses its own rate and valuation; carrier fees, excise and anti-dumping duties are not included.

Part of [K-MCP](https://github.com/groove79/kmcp). MIT.
