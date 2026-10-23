# K-MCP — Korean everyday & business tools for Claude

Ask Claude things that need Korean data and get answers from the source instead of guesses: which days are public holidays (대체공휴일 included), how many business days until a deadline, when VAT or withholding tax is due, what is inside a `.hwp` / `.hwpx` (한글) file, whether a business number is active or closed, the official road-name address, recent apartment trade prices, where a parcel is, and what a Japanese item really costs after customs.

한국 데이터가 필요한 질문에 추측 대신 공식 출처로 답합니다. 공휴일·대체공휴일, 영업일 계산, 부가세·원천세·종소세·4대보험 신고일, 한글(HWP) 문서 읽기와 표 추출, 사업자 휴·폐업 조회, 도로명주소, 아파트 실거래가, 택배 배송조회, 일본 직구 관부가세 계산.

## Install

- **Claude Code:** `/plugin install k-mcp --marketplace groove79/kmcp`
  (older versions: `/plugin marketplace add groove79/kmcp`, then `/plugin install k-mcp@kmcp`)
- **Claude.ai / Claude Desktop without the plugin:** Settings → Connectors → Add custom connector → URL `https://okagent.kr/api/mcp`, authentication **none**.

## What's inside

- **Skills** — when and how Claude should use each tool and how to present the answer:
  `korean-holidays-business-days`, `korean-tax-deadlines`, `hwp-documents`, `korean-business-lookup`, `korean-parcel-tracking`, `japan-import-cost`, `korea-seller-ops`.
- **MCP server** — `k-mcp`, a hosted, read-only server at `https://okagent.kr/api/mcp` (no sign-in, no install). 29 tools:
  - Korea: `kr_list_holidays`, `kr_is_business_day`, `kr_add_business_days`, `kr_tax_calendar`, `kr_tax_rule`, `hwp_to_markdown`, `hwp_extract_tables`, `hwp_info`, `kr_check_business`, `kr_holidays`, `kr_search_address`, `kr_address_english`, `kr_apt_trades`, `delivery_track_parcel`, `delivery_track_many`, `delivery_list_carriers`, `jp_fx_rate`, `jp_landed_cost`, `jp_listing_draft`
  - Worldwide: `world_list_holidays`, `world_is_business_day`, `world_add_business_days`, `world_common_business_days`, `world_list_countries` (200+ countries), `landed_cost`, `landed_cost_rules` (import duty and VAT/GST), `ofd_to_text`, `ofd_invoice_fields`, `ofd_info` (Chinese OFD e-invoices)

Every tool only reads. Nothing in this plugin changes data anywhere. To let Claude act on Naver Smart Store, Coupang, Cafe24, Toss Payments or Popbill (with a confirmation or a KakaoTalk approval before anything changes), install the K-MCP servers locally — see the `korea-seller-ops` skill and https://github.com/groove79/kmcp.

## Usage limits

Light use is free: 100 tool calls per day per IP address. Heavier tools count more (reading an HWP file from a URL counts 10, tracking several parcels counts 2 each). For more, add a free OK Agent key from https://okagent.kr.

## What the plugin runs, sends and fetches

- It runs no local code. Claude calls the hosted MCP server `https://okagent.kr/api/mcp` over HTTPS.
- The server sends only the values needed for an answer to the official source: data.go.kr (National Tax Service business status, KASI holidays, MOLIT apartment trades), juso.go.kr (road-name and English addresses), tracker.delivery (parcel tracking), open.er-api.com (exchange rates). Holidays, business days, tax deadlines and import-duty rules are computed on the server without any outside call.
- For `hwp_*` and `ofd_*` tools you give a public URL or the file as base64; the server downloads or decodes it, converts it, and returns text. Private network addresses are refused.

## Privacy Policy

Full policy: https://okagent.kr/privacy#kmcp

- **Not stored:** what you send to the tools (business numbers, search words, tracking numbers, document contents or links) and the results. They are processed and discarded.
- **Stored:** a daily call counter per caller to apply the free limit — date, tool name, and either a keyed hash of the IP address (never the address itself; IPv6 by /64) or your OK Agent account id when you use a key. Deleted after 13 months.
- **Shared:** only the inputs needed for an answer, with the official sources listed above. Nothing is sold or used for advertising.
- **Logs:** if a call fails, the error message may appear in the hosting provider's (Vercel) logs and is deleted under its retention policy.
- **Contact:** Appmonster (앱몬스터), appmonster.kr@gmail.com, +82-10-7990-5703. You can ask us to delete counters tied to your account at any time.

## License

MIT — see LICENSE.
