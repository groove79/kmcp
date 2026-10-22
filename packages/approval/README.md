# @appmonster/approval

Ask a human before an AI agent does something irreversible. Every [K-MCP](https://github.com/groove79/kmcp) server runs its write tools through this.

```ts
import { writeGateFromEnv, takeConfirmToken } from "@appmonster/approval";

const gate = writeGateFromEnv(process.env, { source: "my-server" });
const { args, token } = takeConfirmToken(rawArgs);
const g = await gate.check("toss_cancel_payment", args, token);
if (!g.ok) return g.message;   // preview / rejected / quota — show it to the agent
```

| Mode | Env | Behaviour |
|---|---|---|
| `confirm` (default) | — | First call returns a preview + one-time `confirm_token`; runs only when re-called with it (same args, 10 min). |
| `approval` | `OKAGENT_API_KEY=ok_…` | Creates a request at [OK Agent](https://okagent.kr); the owner approves on KakaoTalk (or an auto-approve rule does). |
| `direct` | `KMCP_WRITE_MODE=direct` | No check. |

Other env: `OKAGENT_URL` (default `https://okagent.kr`), `APPROVAL_TIMEOUT_SEC` (default 600), `APPROVAL_SOURCE`. Legacy `APPROVAL_URL` / `APPROVAL_API_KEY` still work.

Lower level: `ApprovalClient` (create / get / ask) and `createApprover()` for hosts that only want a boolean `approveWrite` hook.

MIT
