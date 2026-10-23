#!/bin/bash
# awesome-mcp-servers 에 K-MCP 등록 PR 생성 (gh 가 groove79 로 로그인된 상태에서 실행)
set -e
WORK=$(mktemp -d)
cd "$WORK"
gh repo fork punkpeye/awesome-mcp-servers --clone=false >/dev/null 2>&1 || true
sleep 3
gh repo clone groove79/awesome-mcp-servers -- --depth 1 -q
cd awesome-mcp-servers
git remote add upstream https://github.com/punkpeye/awesome-mcp-servers.git 2>/dev/null || true
git fetch upstream main --depth 1 -q && git checkout -q -B add-kmcp upstream/main
python3 - <<'PY'
import re
p="README.md"; s=open(p,encoding="utf-8").read().split("\n")
entries={
 "e-commerce":"- [groove79/kmcp](https://github.com/groove79/kmcp) [![groove79/kmcp MCP server](https://glama.ai/mcp/servers/groove79/kmcp/badges/score.svg)](https://glama.ai/mcp/servers/groove79/kmcp) 📇 ☁️ - Korean commerce toolkit: Naver Smart Store, Coupang, Cafe24 product/order/stock management with a write-safety gate (preview + confirm token, optional KakaoTalk human approval).",
 "finance":"- [groove79/kmcp](https://github.com/groove79/kmcp) [![groove79/kmcp MCP server](https://glama.ai/mcp/servers/groove79/kmcp/badges/score.svg)](https://glama.ai/mcp/servers/groove79/kmcp) 📇 ☁️ - Korean payments & tax: Toss Payments (payments, refunds, settlements) and Popbill (e-tax invoices, KakaoTalk 알림톡) with a write-safety gate for money-moving actions.",
}
def insert(key, line):
    pat = re.compile(r"^###\s.*E-[Cc]ommerce") if key=="e-commerce" else re.compile(r"^###\s.*Finance\s*&(amp;)?\s*Fintech")
    h=next(i for i,l in enumerate(s) if pat.search(l))
    end=next((i for i in range(h+1,len(s)) if s[i].startswith("### ") or s[i].startswith("## ")),len(s))
    items=[i for i in range(h+1,end) if s[i].startswith("- [")]
    if any("groove79/kmcp" in s[i] for i in items): print("이미 있음:",key); return
    pos=next((i for i in items if s[i][3:].lower()>"groove79/kmcp"), items[-1]+1)
    s.insert(pos,line); print("추가:",key,"줄",pos+1)
insert("e-commerce",entries["e-commerce"]); insert("finance",entries["finance"])
open(p,"w",encoding="utf-8").write("\n".join(s))
PY
git add README.md
git commit -q -m "Add K-MCP (Korean commerce, payments & tax MCP servers)"
git push -q -f origin add-kmcp
gh pr create -R punkpeye/awesome-mcp-servers --head groove79:add-kmcp --title "Add K-MCP: Korean commerce, payments & tax MCP servers" --body "Adds **K-MCP** (https://github.com/groove79/kmcp), an MIT-licensed TypeScript monorepo of MCP servers for Korean platforms that have no other MCP coverage:

- **E-Commerce**: Naver Smart Store, Coupang, Cafe24 (products, orders, stock)
- **Finance & Fintech**: Toss Payments (payments, refunds, settlements), Popbill (e-tax invoices, KakaoTalk notifications)

Every write tool goes through a safety gate: by default it returns a preview plus a one-time confirm token, and it can optionally route the action to a human for approval via KakaoTalk. Installable via npx (\`@appmonster/*\`)."
