#!/bin/bash
# 밀린 npm 발행을 태그로 하나씩 올림.
# 주의: GitHub는 한 번에 태그를 4개 이상 푸시하면 Actions를 아예 실행하지 않음 → 반드시 하나씩.
# approval 을 먼저 발행하고 npm 에 보일 때까지 기다린 뒤 나머지(approval 을 의존)를 올림.
set -e
cd "$(dirname "$0")/.."
git fetch -q --tags
ver() { node -p "require('./packages/$1/package.json').version"; }
name() { node -p "require('./packages/$1/package.json').name"; }
release() {
  local p=$1 v; v=$(ver "$p"); local tag="$p-v$v"
  if [ "$(npm view "$(name "$p")@$v" version 2>/dev/null)" = "$v" ]; then echo "= $tag 이미 npm에 있음"; return; fi
  git rev-parse -q --verify "refs/tags/$tag" >/dev/null && git push -q origin ":refs/tags/$tag" 2>/dev/null || true   # 실행 안 된 옛 태그 재사용
  git tag -f "$tag" >/dev/null && git push -q origin "$tag" && echo "↑ $tag"
  sleep 20
}
waitnpm() {
  local p=$1 v; v=$(ver "$p")
  for i in $(seq 1 40); do [ "$(npm view "$(name "$p")@$v" version 2>/dev/null)" = "$v" ] && { echo "✓ $(name "$p")@$v npm 반영"; return; }; sleep 15; done
  echo "✗ $(name "$p")@$v 가 10분 안에 안 보임 — GitHub Actions 'Publish' 로그 확인"; exit 1
}
release approval; waitnpm approval
for p in kr-biz-calendar hwp japan-bridge public-data delivery naver-commerce cafe24 toss-payments coupang kakao popbill; do release "$p"; done
echo "완료. 진행 상황: https://github.com/groove79/kmcp/actions/workflows/publish.yml"
