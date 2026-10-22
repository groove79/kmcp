#!/usr/bin/env bash
# Push the canary's static keys from /Volumes/Dev/.secrets/*.env to GitHub Actions secrets.
# Usage: packages/canary/scripts/push-secrets.sh [owner/repo]   (needs `gh` logged in with admin on the repo)
set -euo pipefail
REPO="${1:-groove79/kmcp}"
DIR="${SECRETS_DIR:-/Volumes/Dev/.secrets}"
NAMES=(CAFE24_MALL_ID CAFE24_CLIENT_ID CAFE24_CLIENT_SECRET CAFE24_REFRESH_TOKEN
       NAVER_COMMERCE_CLIENT_ID NAVER_COMMERCE_CLIENT_SECRET
       KAKAO_REST_API_KEY KAKAO_CLIENT_SECRET KAKAO_REFRESH_TOKEN
       TOSS_SECRET_KEY DATA_GO_KR_KEY JUSO_KEY
       RAKUTEN_APP_ID RAKUTEN_ACCESS_KEY YAHOO_JP_APP_ID
       COUPANG_ACCESS_KEY COUPANG_SECRET_KEY COUPANG_VENDOR_ID
       POPBILL_LINK_ID POPBILL_SECRET_KEY POPBILL_CORP_NUM
       CANARY_DATABASE_URL)
set -a; for f in "$DIR"/*.env; do [ -f "$f" ] && . "$f"; done; set +a
# the newest Cafe24 refresh token lives in the canary's own token file once it has run
if [ -f "$DIR/canary-tokens.json" ]; then
  t=$(node -e 'const j=require(process.argv[1]);const c=j.CAFE24_TOKENSET?JSON.parse(j.CAFE24_TOKENSET):null;process.stdout.write(c?.refresh_token||"")' "$DIR/canary-tokens.json")
  [ -n "$t" ] && CAFE24_REFRESH_TOKEN="$t"
  k=$(node -e 'const j=require(process.argv[1]);const c=j.KAKAO_TOKENSET?JSON.parse(j.KAKAO_TOKENSET):null;process.stdout.write(c?.refresh_token||"")' "$DIR/canary-tokens.json")
  [ -n "$k" ] && KAKAO_REFRESH_TOKEN="$k"
fi
ok=0; skip=0
for n in "${NAMES[@]}"; do
  v="${!n:-}"
  if [ -z "$v" ]; then echo "skip  $n (not set)"; skip=$((skip+1)); continue; fi
  printf '%s' "$v" | gh secret set "$n" -R "$REPO" >/dev/null && echo "set   $n" && ok=$((ok+1))
done
echo "done: $ok set, $skip skipped → https://github.com/$REPO/settings/secrets/actions"
