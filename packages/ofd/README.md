# OFD Reader MCP — Chinese e-invoices (发票) and documents

OFD (GB/T 33190) is China's fixed-layout document format — every e-invoice (电子发票 / 数电票), many official documents and bank statements. Most agents can't open it. This server can: text in reading order, and structured invoice fields.

```bash
npx -y @appmonster/mcp-ofd
```

Hosted (no install, pass `url` or `base64`): `https://okagent.kr/api/mcp` · REST `https://okagent.kr/api/tools`.

| Tool | What it does |
|---|---|
| `ofd_invoice_fields` | Invoice number/code, issue date, buyer & seller name and tax ID, amount before tax, tax, total, check code — from the invoice's embedded tags, else from printed labels |
| `ofd_to_text` | Full text, page by page, lines rebuilt from glyph positions (template pages included) |
| `ofd_info` | Title, creator, dates, page count, signed or not, attachments |

Pass exactly one of `path`, `url`, `base64`. Safe by design: only XML parts are inflated (32 MB per part, 96 MB total), XML entity declarations are refused, nothing is written.

Claude Desktop config:

```json
{ "mcpServers": { "ofd": { "command": "npx", "args": ["-y", "@appmonster/mcp-ofd"] } } }
```

Part of [K-MCP](https://github.com/groove79/kmcp). MIT.
