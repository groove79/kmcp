#!/usr/bin/env node
/**
 *  mcp-hwp                 → MCP server over stdio
 *  mcp-hwp <file.hwp(x)>   → print Markdown to stdout (handy for shell pipelines and for checking a file)
 */
import fs from "node:fs";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { convert } from "./convert.js";

const arg = process.argv[2];
if (arg && fs.existsSync(arg)) {
  const r = convert(fs.readFileSync(arg));
  process.stdout.write(r.markdown);
  console.error(`\n[${r.stats.format} · ${r.stats.paragraphs} paragraphs · ${r.stats.tables} tables · ${r.stats.images} images]`);
} else {
  await createServer().connect(new StdioServerTransport());
}
