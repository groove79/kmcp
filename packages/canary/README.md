# @appmonster/canary (private)

Nightly real-API canary for every K-MCP server, record/replay cassettes for tests, and change watch of platform notices. Design and decisions: [docs/QUALITY.md](../../docs/QUALITY.md).

## Commands (from `packages/canary`, after `pnpm build`)

| Command | What |
|---|---|
| `node dist/cli.js run --live --alert` | real calls with your keys → `status/latest.{json,md}`, KakaoTalk + GitHub issues on failure (what the nightly workflow runs) |
| `node dist/cli.js run --replay` | same checks against recorded cassettes, no network (what CI runs on every PR; exits 1 on BREAK) |
| `node dist/cli.js record <platform>\|all` | re-record cassettes + shapes from real responses (run after a tool's output changes on purpose) |
| `node dist/cli.js watch` | change watch only |
| `--platform cafe24` | limit to one platform |

Keys: on the Mac they load automatically from `/Volumes/Dev/.secrets/*.env`; in CI from repository secrets (see `.github/workflows/canary.yml`). Rotating tokens (Cafe24/Kakao) live in Neon when `CANARY_DATABASE_URL` is set, else in memory for the run.

## Classes

`OK` · `DRIFT` new/renamed fields we don't read (informational) · `BREAK` contract broken or handler threw (fix code, re-record) · `AUTH` 401/403/expired token (rotate the key) · `DOWN` 5xx/timeout (wait) · `SKIP` credentials absent (signup hint in note)

## Adding a platform (30 minutes)

1. Create `src/checks/<platform>.ts` exporting `checks: Check[]` — build the client from `ctx.env` + `ctx.fetchImpl`, call the **tool handlers** (never hand-written requests), give each check a small `expect` schema of the fields agents read. Write checks must be `write-sandbox` with a `revert`.
2. Add it to `src/checks/index.ts`, the secrets to `canary.yml`, and a changelog URL to `src/watch/sources.ts` if the platform has one.
3. `node dist/cli.js record <platform>` with real keys → commit `cassettes/<platform>/`.

## Safety rules
- Writes only on sandboxes/decoys: Cafe24 test mall stock, a Naver product the canary creates in 판매중지 and deletes, Kakao message to self, Popbill TEST server. Real sale products are never touched.
- Cassettes are committed to a public repo: `mask.ts` strips credentials and PII before anything is written. If you add a platform with new PII field names, extend `PII_KEY_RE`.

## Self-hosted runner (Mac mini) — why and how

Naver Commerce requires an IP allow-list and data.go.kr / juso.go.kr only answer Korean IPs, so the nightly job runs on a GitHub self-hosted runner on the Mac mini (`runs-on: self-hosted`). One-time setup (repo admin, i.e. the groove79 account):

1. github.com/groove79/kmcp → Settings → Actions → Runners → **New self-hosted runner** → macOS / ARM64 → run the shown `curl`/`tar`/`./config.sh --url … --token …` commands in `/Volumes/Dev/actions-runner` (labels: leave default `self-hosted`).
2. Install it as a login service so it survives reboots: `cd /Volumes/Dev/actions-runner && ./svc.sh install && ./svc.sh start`.
3. Settings → Actions → General → "Require approval for all outside collaborators" (public repo + self-hosted runner hygiene). The canary workflow has no `pull_request` trigger, and CI stays on `ubuntu-latest`.
4. Manual cloud run when the Mac is off: Actions → Canary → Run workflow → runner = `cloud` (Naver/data.go.kr checks will show AUTH/DOWN there — expected).

Local secrets are **not** read by the runner (it uses GitHub Secrets like the cloud), so keep `push-secrets.sh` in sync after rotating keys.
