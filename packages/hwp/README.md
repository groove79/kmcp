# @appmonster/mcp-hwp

MCP server that turns **HWP / HWPX (한글) documents into Markdown** so AI agents can finally read Korean government notices, contracts, bid documents and office memos. Pure TypeScript, no 한글 installation, no external service — the file never leaves your machine.

한글 문서를 마크다운으로. 공문·계약서·입찰서류를 에이전트가 읽게 합니다.

## Install

```json
{
  "mcpServers": {
    "hwp": { "command": "npx", "args": ["-y", "@appmonster/mcp-hwp"] }
  }
}
```

No keys, no setup. Also works as a CLI: `npx @appmonster/mcp-hwp 공문.hwp > 공문.md`.

## Tools (all read-only)

| Tool | What it does |
| --- | --- |
| `hwp_to_markdown` | Paragraphs, outline headings (개요 1~7 → `#`…), tables → Markdown. Input: `path` \| `url` \| `base64` |
| `hwp_extract_tables` | Every table as JSON `string[][]` — for 물품내역, 견적, 일정표 |
| `hwp_info` | Format, version, title, counts, encryption / 배포용 flags — without the full text |

## What is supported

| | HWP 5.x (binary) | HWPX (OWPML) |
| --- | --- | --- |
| Body text, line breaks, tabs | ✓ | ✓ |
| Headings from 개요/제목 styles | ✓ | ✓ |
| Tables incl. row/col spans | ✓ | ✓ |
| Title / author metadata | best effort | ✓ |
| Images | counted, not extracted | counted, not extracted |
| Password-protected | clear error | — |
| 배포용 (distribution) copies | clear error | — |
| HWP 3.x (1990s format) | not supported — re-save as HWP 5/HWPX | |

## Example prompts

- "이 공문 요약해줘" (파일 첨부 또는 경로)
- "입찰 서류의 물품 내역 표를 엑셀로 옮길 수 있게 JSON으로 뽑아줘"
- "https://…/안내문.hwpx 읽고 마감일이 언제인지 알려줘"

MIT © Appmonster
