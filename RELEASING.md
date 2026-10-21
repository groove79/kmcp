# Releasing a package

One-time setup (repo owner):

1. npm: create the `appmonster` org (or confirm you own the `@appmonster` scope), create an **Automation** token, add it to the GitHub repo as secret `NPM_TOKEN`.
2. GitHub: repo must be public under `groove79/kmcp` — the MCP Registry namespace `io.github.groove79/*` is proven by GitHub OIDC in the workflow, no extra secret.

Per release:

```bash
cd /Volumes/Dev/kmcp
# bump version in BOTH files of the package (they must match the tag)
#   packages/naver-commerce/package.json  → "version"
#   packages/naver-commerce/server.json   → "version" and packages[0].version
git commit -am "release: naver-commerce 0.1.1"
git tag naver-commerce-v0.1.1
git push && git push --tags
```

The `Publish` workflow then: checks versions match the tag → build → test → `npm publish --provenance` → `mcp-publisher publish`.

After the registry accepts it, it propagates to GitHub MCP, VS Code, PulseMCP, MCP Harbor within hours. Then do the one-time manual listings (Smithery CLI, mcp.so form, Glama claim) — see the plan doc's marketing section.
