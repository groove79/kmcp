import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { convert, loadSource } from "./convert.js";

const sourceShape = {
  path: z.string().optional().describe("Local file path, e.g. ~/Downloads/공문.hwp"),
  url: z.string().url().optional().describe("http(s) URL of a .hwp/.hwpx file"),
  base64: z.string().optional().describe("Base64 file contents (for clients that cannot share a path)"),
};

export interface ServerOptions { fetchImpl?: typeof fetch }

export function createServer(opts: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "kmcp-hwp", version: "0.1.1" });
  const text = (s: string) => ({ type: "text" as const, text: s });
  const ro = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

  server.registerTool(
    "hwp_to_markdown",
    {
      description:
        "Convert a Korean HWP or HWPX (한글) document to Markdown: paragraphs, outline headings, tables. Pass exactly one of path | url | base64. " +
        "한글 문서를 마크다운으로 변환합니다. Use whenever a user gives you a .hwp/.hwpx file or link (공문, 계약서, 입찰서류). Needs the file location.",
      inputSchema: { ...sourceShape, maxChars: z.number().int().min(1000).max(400_000).default(120_000).describe("Truncate output beyond this many characters") },
      annotations: ro,
    },
    async (args) => {
      try {
        const { buf, name } = await loadSource(args, opts.fetchImpl);
        const r = convert(buf);
        const md = r.markdown.length > args.maxChars ? r.markdown.slice(0, args.maxChars) + `\n\n…[truncated ${r.markdown.length - args.maxChars} chars]` : r.markdown;
        const head = `<!-- ${name} · ${r.stats.format.toUpperCase()}${r.stats.version ? " " + r.stats.version : ""} · ${r.stats.paragraphs} paragraphs · ${r.stats.tables} tables · ${r.stats.images} images${r.doc.meta.title ? ` · title: ${r.doc.meta.title}` : ""} -->\n\n`;
        return { content: [text(head + md)] };
      } catch (e) {
        return { content: [text(e instanceof Error ? e.message : String(e))], isError: true };
      }
    },
  );

  server.registerTool(
    "hwp_extract_tables",
    {
      description:
        "Extract all tables from an HWP/HWPX document as JSON arrays (rows × columns of cell text). " +
        "한글 문서의 표를 JSON 배열로 추출합니다. Use for 물품내역, 견적, 일정표 — anything you will compute on. Needs the file location.",
      inputSchema: sourceShape,
      annotations: ro,
    },
    async (args) => {
      try {
        const { buf, name } = await loadSource(args, opts.fetchImpl);
        const r = convert(buf);
        return { content: [text(JSON.stringify({ file: name, tables: r.tables }, null, 2))] };
      } catch (e) {
        return { content: [text(e instanceof Error ? e.message : String(e))], isError: true };
      }
    },
  );

  server.registerTool(
    "hwp_info",
    {
      description:
        "Quick facts about an HWP/HWPX file without the full text: format, version, title, section/paragraph/table/image counts, whether it is encrypted or a 배포용 copy. " +
        "변환 전에 문서 정보를 확인합니다. Needs the file location.",
      inputSchema: sourceShape,
      annotations: ro,
    },
    async (args) => {
      try {
        const { buf, name } = await loadSource(args, opts.fetchImpl);
        const r = convert(buf);
        return { content: [text(JSON.stringify({ file: name, ...r.stats, title: r.doc.meta.title, author: r.doc.meta.author }, null, 2))] };
      } catch (e) {
        return { content: [text(e instanceof Error ? e.message : String(e))], isError: true };
      }
    },
  );

  return server;
}
