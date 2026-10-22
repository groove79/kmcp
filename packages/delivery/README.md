# @appmonster/mcp-delivery

MCP server for **parcel tracking** — Korean carriers (CJ대한통운, 우체국, 한진, 롯데, 로젠, 경동, 쿠팡, 편의점택배…) and global ones (Yamato, Sagawa, Japan Post, DHL, UPS, FedEx, USPS, EMS) through [Delivery Tracker](https://tracker.delivery). Read-only. Korean carrier names work directly.

택배 조회 MCP 서버 — "이 주문 어디쯤이야?", "오늘 발송분 중 아직 안 간 거?"를 에이전트가 답합니다.

## Tools

| Tool | What it does |
|---|---|
| `delivery_track_parcel` | one parcel → status (접수/집화/이동중/배송출발/배송완료/실패/수령대기/이상), `delivered`, `needsAttention`, last event, event history (KST) |
| `delivery_track_many` | up to 20 parcels → per-parcel status + counts (delivered / in transit / needs attention); errors isolated per parcel; your `ref` echoed back |
| `delivery_list_carriers` | supported carriers (id + name) with the built-in aliases |

Carrier can be a name (`CJ대한통운`, `우체국`, `한진`, `야마토`, `DHL`) or an id (`kr.cjlogistics`). Unknown names fall back to a live search.

## Setup (1 minute, free)

1. https://console.tracker.delivery → sign in (Google/email) → **Create Project** → **Credentials** → **Create** → copy Client ID / Client Secret (the secret is shown once).
2. Claude Desktop / Cursor:
```json
{ "mcpServers": { "delivery": { "command": "npx", "args": ["-y", "@appmonster/mcp-delivery"],
  "env": { "DELIVERY_TRACKER_CLIENT_ID": "…", "DELIVERY_TRACKER_CLIENT_SECRET": "…" } } } }
```

## Example prompts

- "CJ 1234-5678-9012 지금 어디야?" → `delivery_track_parcel`
- "어제 발송한 스마트스토어 주문 전부 배송 상태 확인해줘" → `naver_list_orders` → `delivery_track_many` (ref = 주문번호)
- "배송 이상 있는 건만 골라서 고객한테 보낼 문자 초안 써줘" → `delivery_track_many` → filter `needsAttention`

## Notes
- **Free plan credentials expire every 21 days** — the console shows the expiration; create a new pair before then (our nightly canary flags it as `AUTH` when it lapses). Paid plans get lifetime credentials.
- Delivery Tracker answers in < 1 s typically; this client gives up after 15 s with a `TIMEOUT` error instead of hanging the agent.
- Brand-new labels can take a few hours before the carrier reports anything (`NOT_FOUND` with a hint).
- Times are converted to KST (`+09:00`).

MIT © Appmonster
