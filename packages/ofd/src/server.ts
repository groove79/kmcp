import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadSource } from "./source.js";
import { parseOfd, toText, invoiceFields } from "./ofd.js";

const sourceShape = {
  path: z.string().optional().describe("Local file path of a .ofd file"),
  url: z.string().url().optional().describe("http(s) URL of a .ofd file"),
  base64: z.string().optional().describe("Base64 file contents (for clients that cannot share a path)"),
};

export interface ServerOptions { fetchImpl?: typeof fetch }

export function createServer(opts: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "kmcp-ofd", version: "0.1.0" });
  const out = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
  const fail = (e: unknown) => ({ content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }], isError: true });
  const ro = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

  server.registerTool("ofd_to_text", {
    title: "Read OFD document",
    description: "Extract the text of a Chinese OFD document (GB/T 33190: e-invoices 电子发票/数电票, official documents, bank statements) in reading order, page by page. Pass exactly one of path | url | base64.",
    inputSchema: { ...sourceShape, maxChars: z.number().int().min(1000).max(400_000).default(120_000) },
    annotations: ro,
  }, async (a) => {
    try {
      const { buf, name } = await loadSource(a, opts.fetchImpl);
      const d = parseOfd(buf);
      const t = toText(d);
      return out(`<!-- ${name} · OFD · ${d.meta.pageCount} pages${d.meta.title ? ` · ${d.meta.title}` : ""} -->\n\n` + (t.length > a.maxChars ? t.slice(0, a.maxChars) + `\n…[truncated ${t.length - a.maxChars} chars]` : t));
    } catch (e) { return fail(e); }
  });

  server.registerTool("ofd_invoice_fields", {
    title: "Read OFD e-invoice fields",
    description: "Extract structured fields from a Chinese OFD e-invoice (发票): invoice number and code, issue date, buyer and seller name and tax ID, amount before tax, tax, total. Uses the invoice's embedded tags, else the printed labels. Pass exactly one of path | url | base64.",
    inputSchema: sourceShape,
    annotations: ro,
  }, async (a) => {
    try {
      const { buf, name } = await loadSource(a, opts.fetchImpl);
      const d = parseOfd(buf);
      return out(JSON.stringify({ file: name, ...invoiceFields(d) }, null, 2));
    } catch (e) { return fail(e); }
  });

  server.registerTool("ofd_info", {
    title: "OFD file info",
    description: "Quick facts about an OFD file without the full text: title, author, creator software, creation date, page count, whether it is digitally signed, attachments, embedded tags.",
    inputSchema: sourceShape,
    annotations: ro,
  }, async (a) => {
    try {
      const { buf, name } = await loadSource(a, opts.fetchImpl);
      const d = parseOfd(buf);
      return out(JSON.stringify({ file: name, ...d.meta, tagCount: Object.keys(d.tags).length }, null, 2));
    } catch (e) { return fail(e); }
  });

  return server;
}
