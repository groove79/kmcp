---
name: hwp-documents
description: Use whenever a user shares or links a Korean 한글 document (.hwp or .hwpx) — 공문, 계약서, 입찰 서류, 견적서, 학교·관공서 양식 — and wants it read, summarized, translated, or its tables pulled out (e.g. to Excel/CSV or to total amounts), or asks how to open an HWP file without 한컴오피스.
---

# Reading HWP / HWPX (한글) documents

Claude cannot read the HWP binary format by itself. The k-mcp server converts it.

## Tools
- `hwp_info { url | base64 }` — format, version, title, paragraph/table/image counts. Quick check first for large files.
- `hwp_to_markdown { url | base64, maxChars? }` — full text as Markdown with headings and tables.
- `hwp_extract_tables { url | base64 }` — every table as rows × cells (JSON). Use for numbers, lists, schedules.

Pass exactly one of `url` (a public http/https link) or `base64` (file contents, up to ~3 MB). Links to private networks are refused. A URL read counts 10 calls of the daily allowance, base64 counts 2.

## How to answer
1. If the user attached the file in chat, send it as `base64`. If they gave a link, use `url`.
2. For "요약해줘": run `hwp_to_markdown`, then summarize — 목적, 핵심 내용, 기한·금액·담당자 — in the user's language.
3. For "표 뽑아줘 / 엑셀로": run `hwp_extract_tables`, show the table in Markdown, and offer CSV. When totals are asked, compute them from the cells and show the formula.
4. Old HWP 3.x files and password-protected or 배포용 documents may fail; say so and suggest re-saving as HWPX or PDF in 한글.
5. To open HWP without 한컴오피스 the user can also use 한컴오피스 뷰어 (free) or 한컴독스 웹; mention it when they only want to view.
