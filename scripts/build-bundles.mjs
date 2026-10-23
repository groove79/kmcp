#!/usr/bin/env node
/**
 * Build Claude Desktop one-click bundles (.mcpb) for K-MCP servers.
 *
 *   node scripts/build-bundles.mjs                 # build packages, bundle, validate, pack all
 *   node scripts/build-bundles.mjs hwp coupang     # only these
 *   node scripts/build-bundles.mjs --no-build      # skip `pnpm -r build` (use existing dist/)
 *
 * Output: dist-bundles/kmcp-<name>-<version>.mcpb  (upload these to a GitHub Release)
 * Each bundle is self-contained: server/index.js is a single esbuild file, no node_modules.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ESBUILD = "esbuild@0.24.2";
const MCPB = "@anthropic-ai/mcpb@latest";
const ALL = ["kr-biz-calendar", "hwp", "public-data", "delivery", "naver-commerce", "coupang", "cafe24", "popbill", "toss-payments", "kakao", "japan-bridge"];

const args = process.argv.slice(2);
const skipBuild = args.includes("--no-build");
const names = args.filter((a) => !a.startsWith("--"));
const targets = names.length ? names : ALL;
for (const n of targets) if (!ALL.includes(n)) { console.error(`unknown bundle: ${n}`); process.exit(1); }

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
function run(cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, { stdio: "inherit", cwd: root, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${argv.join(" ")} failed (${r.status})`);
}

if (!skipBuild) run(npx, ["-y", "pnpm@10.28.0", "-r", "build"]);

const buildDir = path.join(root, "bundles", ".build");
const outDir = path.join(root, "dist-bundles");
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const results = [];
for (const name of targets) {
  const pkgDir = path.join(root, "packages", name);
  const bundleDir = path.join(root, "bundles", name);
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  const cli = path.join(pkgDir, "dist", "cli.js");
  if (!fs.existsSync(cli)) throw new Error(`${cli} missing — run the package build first`);

  // 1) launcher: Claude Desktop passes "" (or an unresolved "${user_config.x}") for optional
  //    settings the user left blank. Treat those as unset before the server reads its env.
  const launcher = path.join(buildDir, `${name}-launcher.mjs`);
  fs.writeFileSync(
    launcher,
    `for (const [k, v] of Object.entries(process.env)) {\n` +
      `  if (v === undefined || v.trim() === "" || v.startsWith("\${user_config.")) delete process.env[k];\n` +
      `}\n` +
      `await import(${JSON.stringify(path.relative(buildDir, cli).split(path.sep).join("/"))});\n`,
  );

  // 2) single-file server
  const serverDir = path.join(bundleDir, "server");
  fs.mkdirSync(serverDir, { recursive: true });
  run(npx, [
    "-y", ESBUILD, launcher,
    "--bundle", "--platform=node", "--target=node20", "--format=esm",
    `--outfile=${path.join(serverDir, "index.js")}`,
    "--log-level=warning", "--legal-comments=none",
    "--banner:js=import { createRequire as __kmcpCreateRequire } from 'node:module'; const require = __kmcpCreateRequire(import.meta.url);",
  ]);
  fs.writeFileSync(path.join(serverDir, "package.json"), JSON.stringify({ type: "module" }) + "\n");

  // 3) icon + version sync
  fs.copyFileSync(path.join(root, "bundles", "icon.png"), path.join(bundleDir, "icon.png"));
  const manifestPath = path.join(bundleDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.version !== pkg.version) {
    manifest.version = pkg.version;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  }

  // 4) validate + pack
  run(npx, ["-y", MCPB, "validate", manifestPath]);
  const out = path.join(outDir, `kmcp-${name}-${pkg.version}.mcpb`);
  run(npx, ["-y", MCPB, "pack", bundleDir, out]);
  results.push({ name, version: pkg.version, file: path.relative(root, out), kb: Math.round(fs.statSync(out).size / 1024) });
}

console.log("\nBuilt bundles:");
for (const r of results) console.log(`  ${r.file}  (${r.kb} KB)`);
