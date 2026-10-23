#!/bin/bash
# PR #17323 충돌 해결: 최신 upstream/main 위에 K-MCP 두 줄을 다시 넣고 add-kmcp 브랜치를 강제 푸시 (PR 은 그대로 갱신됨)
set -e
WORK=$(mktemp -d)
cd "$WORK"
gh repo sync groove79/awesome-mcp-servers -b main >/dev/null 2>&1 || true
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
git diff --stat upstream/main
git push -q -f origin add-kmcp
echo "완료: https://github.com/punkpeye/awesome-mcp-servers/pull/17323"
gh pr view 17323 -R punkpeye/awesome-mcp-servers --json mergeable,mergeStateStatus
