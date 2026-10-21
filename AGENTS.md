# AGENTS.md — working in this repo

- pnpm workspace, TypeScript ESM (`"type": "module"`, NodeNext). Import local files with `.js` extension.
- Build: `pnpm build`. Test: `pnpm test` (node:test via tsx, no real network — tests inject `fetchImpl`).
- Each server lives in `packages/<platform>/` with `src/{auth,client,tools,server,cli,index}.ts`, a `README.md`, and a `server.json` for the MCP registry.
- Tool naming: `<platform>_<verb>_<object>`. Description: English sentence first, Korean second, then "Use when…" and "Needs…".
- Mark every tool `access: "read" | "write"`. Write tools must go through `approveWrite` when provided.
- Never log or persist credentials. Never commit `.env`.
- Commits are made by the repo owner, not by agents.
