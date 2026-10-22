# Quality automation — canary, record/replay, change watch

> Goal: a human never has to sit through "실검증" again. Every platform we ship a server for is exercised
> against the real API on a schedule with our own accounts, responses are recorded so unit tests run on
> real data, drift is detected and classified, and we are told (KakaoTalk + GitHub issue) before users are.
> What cannot be automated — knowing *how* a platform will change — is replaced by *noticing within a day*.

## 0. Decisions (fixed — change here first, not in code)

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Where it lives | `packages/canary` (private, `"private": true`, never published) | reuses every server's `fetchImpl` injection; no new infra |
| D2 | Accounts used | our own test/seller accounts only (appmonster Cafe24 test mall, 일본구매대행 Smart Store, Kakao app 1617054, Toss test key, data.go.kr, Rakuten app, Popbill test server) | the only truthful source is the real API |
| D3 | Write checks | only against **sandboxes** and only **self-reverting** pairs (stock 0→7→0, create-suspended→delete, popbill test issue→cancel). Never on live sale state. | a canary must not change the business |
| D4 | Schedule | GitHub Actions cron `0 20 * * *` (05:00 KST) + `workflow_dispatch` + replay-only run on every PR | once a day is enough to notice before customers; replay keeps CI network-free |
| D5 | Rotating tokens (Cafe24 refresh rotates every use, Kakao refresh may rotate) | stored in a **Neon table `canary_secrets`** (same Neon project *and database* as OK Agent — Vercel's Free Neon plan allows one store; the table name keeps it separate), read/written by the run. Static keys stay in GitHub Secrets. | GitHub Secrets cannot be updated from a workflow without a PAT; a DB row can |
| D6 | Alerting | failure → `kakao_send_to_me` (our own package) **and** a GitHub issue per platform (dedup by open issue label `canary:<platform>`); recovery closes the issue | KakaoTalk reaches the phone; the issue is the work queue for the fix |
| D7 | Status output | `status/latest.json` + `status/YYYY-MM-DD.json` committed to branch `canary-status`; rendered later at `aeo.appmonster.co.kr/status` (phase 2, optional) | public "Korean commerce API status board" doubles as marketing + product-5 data |
| D8 | Drift classes | `OK` · `DRIFT` (new/renamed optional fields; informational) · `BREAK` (missing required field, type change, tool handler threw, unexpected error code) · `AUTH` (401/403/token refresh failed) · `DOWN` (5xx/timeout/DNS) · `SKIP` (credentials absent) | fixes differ: AUTH = rotate key (human), BREAK = code change (agent), DOWN = wait |
| D9 | Auto-fix | phase 1: issue contains the diff + failing check; phase 2: `anthropics/claude-code-action` on issues labelled `canary:break` opens a PR with code+cassette fix, CI runs replay, human merges | start with the loop humans trust, automate once the signal is clean |
| D10 | Adding a platform | exactly one new file `packages/canary/src/checks/<platform>.ts` + secrets + `pnpm canary record <platform>`; README template below | "앞으로 계속 추가" must be a 30-minute job |
| D12 | Where the nightly run executes | **self-hosted GitHub runner on the Mac mini** (KR IP, allow-listed at Naver). Cloud runner only via manual `runner=cloud`. | first cloud run (2026-10-22) proved Naver Commerce (`GW.IP_NOT_ALLOWED`) and data.go.kr/juso (KR-only) are unreachable from GitHub's US runners — the same fact that makes the stage-2 gateway need a fixed KR IP |
| D13 | Known platform issues | `knownIssue` on a check turns DOWN/BREAK into DRIFT with the note, so a confirmed platform-side defect (e.g. Toss test merchants' `/v1/transactions` hanging) does not page every night; removed when fixed | alerts must stay rare to stay read |
| D11 | Secrets never in cassettes | recorder masks `Authorization`, `*token*`, `*secret*`, `*key*` headers/query/body fields, plus platform-specific PII (buyer name/phone/address/email) before writing | cassettes are committed to the public repo |

## 1. Components

```
packages/canary/
  src/
    recorder.ts        record / replay fetch wrappers (cassette = JSON per check)
    mask.ts            secret + PII masking rules (global + per-platform)
    schema.ts          shape extraction (keys + primitive types) and diff → drift class
    secrets.ts         GitHub-Secrets env + Neon canary_secrets (get/set rotating tokens)
    checks/
      _types.ts        Check definition type
      cafe24.ts        listProducts, getStore, [write] updateInventory 0→7→0
      naver-commerce.ts listProducts, listOrders(24h), [write] createProduct(SUSPENSION)→delete
      coupang.ts       listProducts (SKIP until seller account)
      kakao.ts         me, [write] sendToMe("canary ok <date>") — doubles as the alert channel test
      toss-payments.ts listSettlements(today), listTransactions(3-day clamp)
      popbill.ts       checkAccount, [write] issue→cancel on TEST server (SKIP until LinkID)
      public-data.ts   checkBusiness(528-73-00609), holidays(year), searchAddress, aptTrades
      japan-bridge.ts  searchRakuten("ティースプーン"), fxRate, landedCost (pure)
      kr-biz-calendar.ts isBusinessDay(today), taxCalendar(month) (pure, always runs)
      hwp.ts           hwp_info on fixture file (pure)
    watch/
      _types.ts        Watcher definition: { platform, url, extract(html) → entries[] }
      sources.ts       changelog/notice URLs per platform (list below)
      run.ts           fetch → extract → diff against last snapshot → report
    report.ts          build status JSON, summary markdown, decide alerts
    alert.ts           kakao self message + gh issue open/close
    cli.ts             canary run [--live|--replay] [--platform x] · canary record <platform> · canary watch
  cassettes/<platform>/<checkId>.json
  snapshots/watch/<platform>.json
  README.md
.github/workflows/canary.yml
```

### 1.1 Check definition
```ts
interface Check {
  id: string;                       // "cafe24.listProducts"
  platform: string;
  access: "read" | "write-sandbox" | "pure";
  needs: string[];                  // env names; missing → SKIP
  run(ctx: Ctx): Promise<unknown>;  // calls the real tool handler with injected fetch
  expect: z.ZodTypeAny;             // minimal contract (fields we actually read)
  revert?(ctx: Ctx, out: unknown): Promise<void>; // for write-sandbox
  timeoutMs?: number;               // default 30 000
}
```
`run` must go through the **same code path users run** (the tool handler), never a hand-written request — that is the whole point.

### 1.2 Recorder
- `record`: wraps real `fetch`; stores `{ req: {method, url(masked query), bodyHash}, res: {status, headers(subset), body(masked)} }` keyed by `method + path + sorted-query-without-volatile`. Volatile query/header keys: `timestamp`, `signed-date`, `client_secret_sign`, `Authorization`, `X-*-Signature`, `access_token`, `code`, `state`.
- `replay`: looks up by the same key; unknown request → test fails with "no cassette" (forces re-record on code change).
- Cassettes are rewritten only by `canary record` (explicit), never by the nightly run; nightly compares live **shape** to cassette shape.

### 1.3 Drift classification (schema.ts)
1. Tool handler threw → `BREAK` (error text captured) unless status 401/403 → `AUTH`, 5xx/ETIMEDOUT/ENOTFOUND → `DOWN`.
2. Output fails `expect` → `BREAK` (zod issues listed).
3. Shape diff vs cassette: removed key or type change on a key we read → `BREAK`; otherwise `DRIFT` (reported, no alert).
4. Else `OK`.

### 1.4 Secrets (secrets.ts)
- Static: GitHub Secrets → env (`CAFE24_CLIENT_ID`, `NAVER_COMMERCE_*`, `KAKAO_REST_API_KEY`, `TOSS_SECRET_KEY`, `DATA_GO_KR_KEY`, `JUSO_KEY`, `RAKUTEN_*`, `POPBILL_*`, `COUPANG_*`).
- Rotating: `CANARY_DATABASE_URL` (Neon) → table `canary_secrets(name text primary key, value text, updated_at timestamptz)` holding `CAFE24_REFRESH_TOKEN`, `KAKAO_REFRESH_TOKEN`. The run reads them into the servers' token stores (a `DbTokenStore` implementing each package's `TokenStore`) and writes back on rotation. Seeded once from `/Volumes/Dev/.secrets/*`.
- Local dev: `canary run --live` reads `/Volumes/Dev/.secrets/*.env` when present.

### 1.5 Watchers (watch/sources.ts) — first set
| Platform | Source | Method |
|---|---|---|
| Naver Commerce API | apicenter.commerce.naver.com 공지 + 변경이력 | HTML list → entries(title,date,url); blocked from CI? → fallback: OpenAPI spec JSON hash |
| Cafe24 | developers.cafe24.com release notes / API version list (`X-Cafe24-Api-Version` latest) | HTML + version string |
| Coupang Wing | developers.coupangcorp.com 공지 | HTML |
| Toss Payments | docs.tosspayments.com/reference changelog | HTML |
| Kakao Developers | devtalk.kakao.com 공지 (API 변경) RSS | RSS |
| Popbill | developers.popbill.com SDK release (npm `popbill` version) | npm registry JSON |
| data.go.kr | each dataset page "수정일" + API version | HTML |
| Rakuten Web Service | webservice.rakuten.co.jp Information list | HTML |
| Yahoo! JAPAN | developer.yahoo.co.jp changelog | HTML (when added) |
Each watcher stores `snapshots/watch/<platform>.json`; new entries since last snapshot appear in the status JSON and summary (no alert by themselves; alert only if a check also fails that day, or entry text matches `deprecat|종료|폐지|변경 안내|필수`).

### 1.6 Workflow (`.github/workflows/canary.yml`)
```
on: schedule 0 20 * * * · workflow_dispatch(platform) 
jobs.live:  pnpm install → pnpm build → pnpm canary run --live → pnpm canary watch
            → commit status/*.json to canary-status branch
            → if any BREAK/AUTH/DOWN: alert (kakao + issue); if recovered: close issue
            → upload summary to $GITHUB_STEP_SUMMARY
CI (existing): add `pnpm canary run --replay` after `pnpm test` (no secrets needed)
```
Timeouts: job 15 min; per check 30 s; the Kakao send doubles as "alerting works" proof.

### 1.7 Status JSON (status/latest.json)
```json
{ "ranAt": "2026-10-23T05:00:12+09:00", "summary": {"OK": 21, "DRIFT": 1, "BREAK": 0, "AUTH": 0, "DOWN": 0, "SKIP": 3},
  "checks": [ { "id": "cafe24.listProducts", "class": "OK", "ms": 412, "note": null }, … ],
  "watch":  [ { "platform": "naver-commerce", "new": [ {"title": "...", "date": "...", "url": "..."} ] } ] }
```

## 2. Adding a platform (the 30-minute path)
1. Ship the server package as usual (tools with `fetchImpl` injection).
2. `packages/canary/src/checks/<platform>.ts`: 1–3 read checks, optional 1 self-reverting write check, `needs` env list, `expect` schema of the fields the tools actually surface.
3. Add secrets to GitHub (static) or Neon (rotating); add a watcher source if the platform has a changelog.
4. `pnpm canary record <platform>` locally with real creds → commit cassettes.
5. Done: next nightly run includes it; PR CI replays it.

## 3. Non-goals (explicitly)
- Simulating platforms we have no account for. We list them as `SKIP` with the signup link so the gap is visible on the status board.
- Browser/UI-level checks (seller admin screens). API only.
- Load/perf testing.

## 4. Rollout
- Day 1: recorder + schema + secrets + checks for cafe24, naver, kakao, toss, public-data, kr-biz-calendar, hwp, japan-bridge(rakuten when key arrives) + workflow + status branch + kakao/issue alerts. Re-record cassettes from real responses and switch existing unit tests that can use them.
- Day 2: watchers (first 5 sources) + status page on aeo.appmonster.co.kr.
- Later: claude-code-action auto-fix PRs (D9 phase 2); coupang/popbill checks when accounts exist.
