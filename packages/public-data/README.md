# @appmonster/mcp-public-data

MCP server for **Korean public data** — the lookups every agent working in Korea needs: is this business registration active, when are the holidays, what is the normalized address, what did apartments sell for.

한국 공공데이터 MCP 서버 — 사업자 상태, 공휴일, 도로명주소, 아파트 실거래가.

## Keys (free)

| Env | Where | Needed by |
| --- | --- | --- |
| `DATA_GO_KR_KEY` | [data.go.kr](https://www.data.go.kr) → 활용신청: 국세청 사업자등록정보 진위확인 및 상태조회 · 한국천문연구원 특일 정보 · 국토교통부 아파트 매매 실거래가 상세 | `kr_check_business`, `kr_holidays`, `kr_apt_trades` |
| `JUSO_KEY` | [business.juso.go.kr](https://business.juso.go.kr) → 도로명주소 API 신청 | `kr_search_address` |

Use the **decoded** data.go.kr key (the one without `%2B`/`%3D`). One key works for all three data.go.kr services once each is approved (usually instant).

## Install

```json
{
  "mcpServers": {
    "kr-public": {
      "command": "npx",
      "args": ["-y", "@appmonster/mcp-public-data"],
      "env": { "DATA_GO_KR_KEY": "…", "JUSO_KEY": "…" }
    }
  }
}
```

## Tools (all read-only)

| Tool | What it does |
| --- | --- |
| `kr_check_business` | NTS status for up to 100 business numbers: active / suspended / closed, tax type, closure date |
| `kr_holidays` | Public + substitute holidays for a year or month (KASI) |
| `kr_search_address` | Road/lot address, postal code, building, admin code for a keyword |
| `kr_apt_trades` | Apartment sale transactions for a 5-digit district code and YYYYMM, optional name filter |

## Example prompts

- "이 거래처 사업자번호 123-45-67890 지금도 영업 중이야?"
- "2027년 1월 공휴일 알려줘 — 배송 안내문에 쓸 거야"
- "송도동 효성메트하임 9월 실거래가"

MIT © Appmonster
