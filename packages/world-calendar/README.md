# World Business Calendar MCP

Agents get dates wrong. This server answers "is it a working day there?" and "what date is 5 business days from now?" for **200+ countries and their states/regions**, with local weekends (Friday–Saturday in Saudi Arabia, Israel, Egypt; Friday in Iran) and observed/substitute holidays. Offline, no API keys.

```bash
npx -y @appmonster/mcp-world-calendar
```

Hosted (no install): `https://okagent.kr/api/mcp` (Streamable HTTP) — or REST `https://okagent.kr/api/tools`.

| Tool | What it does |
|---|---|
| `world_list_holidays` | Holidays of a country/region for a year (English + local names, public/bank/optional) |
| `world_is_business_day` | Working day or not, next/previous working day (default: today in that country) |
| `world_add_business_days` | Add/subtract N working days, or count working days between two dates |
| `world_common_business_days` | Dates that are working days in all of several countries (cross-border meetings, settlements) |
| `world_list_countries` | Supported country and region codes |

Claude Desktop config:

```json
{ "mcpServers": { "world-calendar": { "command": "npx", "args": ["-y", "@appmonster/mcp-world-calendar"] } } }
```

Data: [date-holidays](https://github.com/commenthol/date-holidays) (ISC code, holiday data CC-BY-3.0, © commenthol and contributors). Korea uses the K-MCP Korean engine (includes 2026 changes). Part of [K-MCP](https://github.com/groove79/kmcp). MIT.
