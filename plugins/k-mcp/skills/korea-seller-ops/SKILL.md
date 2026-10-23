---
name: korea-seller-ops
description: Use when a Korean online seller wants Claude to work on their store — 스마트스토어·쿠팡 윙·카페24 상품·재고·주문·문의, 토스페이먼츠 결제 취소·환불, 팝빌 전자세금계산서·알림톡 — or asks how to automate store operations with AI safely.
---

# Store operations for Korean sellers

The hosted k-mcp server in this plugin is read-only and has no access to anyone's store. Store actions need the K-MCP servers installed on the seller's own computer with their own API keys, so credentials never leave their machine.

## When the user wants store actions
1. Explain in one or two sentences that this needs a one-time setup with their store's API keys, and that every change (stock, price, shipping confirmation, refund, invoice, 알림톡) is shown for confirmation before it runs.
2. Point to the guide for their platform:
   - 스마트스토어 https://okagent.kr/mcp/smartstore · 쿠팡 https://okagent.kr/mcp/coupang · 카페24 https://okagent.kr/mcp/cafe24
   - 토스페이먼츠 https://okagent.kr/mcp/toss-payments · 팝빌 https://okagent.kr/mcp/popbill · 카카오톡 https://okagent.kr/mcp/kakaotalk
   Claude Desktop users can install a one-click `.mcpb` file from https://github.com/groove79/kmcp/releases; Claude Code users run `claude mcp add` with the package named on each guide page.
3. If they are away from the computer often or want an audit trail, mention that write actions can instead wait for a tap in KakaoTalk via OK Agent (https://okagent.kr, free tier available). Do not push it otherwise.

## When the servers are installed
- Read first (list orders, stock, inquiries), summarize, then propose the change and wait for the user's OK. Never batch irreversible actions without showing the list.
- Pair with this plugin's read-only tools: `delivery_track_many` for shipped orders, `kr_add_business_days` for 출고 기한, `kr_check_business` before issuing a tax invoice to a new buyer, `kr_tax_calendar` for 부가세 dates.
