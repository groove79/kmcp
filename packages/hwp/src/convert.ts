import fs from "node:fs";
import path from "node:path";
import { parseHwp5 } from "./hwp5.js";
import { parseHwpx } from "./hwpx.js";
import { toMarkdown, tablesToJson, type HwpDocument } from "./model.js";

export const MAX_BYTES = 25 * 1024 * 1024;

export function detectFormat(buf: Buffer): "hwp" | "hwpx" | "unknown" {
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0xd0cf11e0 && buf.readUInt32BE(4) === 0xa1b11ae1) return "hwp"; // CFB magic
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) return "hwpx"; // ZIP magic
  return "unknown";
}

export function parseAny(buf: Buffer): HwpDocument {
  if (buf.length > MAX_BYTES) throw new Error(`File too large (${(buf.length / 1048576).toFixed(1)} MB > 25 MB).`);
  const f = detectFormat(buf);
  if (f === "hwp") return parseHwp5(buf);
  if (f === "hwpx") return parseHwpx(buf);
  throw new Error("Unrecognized file: not HWP (CFB) or HWPX (ZIP). If this is an old HWP 3.x file, re-save it in 한글 as HWP 5 or HWPX.");
}

export interface Source { path?: string; url?: string; base64?: string }

export async function loadSource(src: Source, fetchImpl: typeof fetch = fetch): Promise<{ buf: Buffer; name: string }> {
  const n = [src.path, src.url, src.base64].filter(Boolean).length;
  if (n !== 1) throw new Error("Provide exactly one of path, url, base64.");
  if (src.path) {
    const p = path.resolve(src.path.replace(/^~(?=$|\/)/, process.env.HOME ?? "~"));
    if (!fs.existsSync(p)) throw new Error(`File not found: ${p}`);
    return { buf: fs.readFileSync(p), name: path.basename(p) };
  }
  if (src.url) {
    const u = new URL(src.url);
    if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) URLs are supported.");
    const res = await fetchImpl(u, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "mcp-hwp/0.1 (+https://github.com/groove79/kmcp)" } });
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const cd = res.headers.get("content-disposition") ?? "";
    const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i);
    return { buf, name: m ? decodeURIComponent(m[1]) : path.basename(u.pathname) || "document" };
  }
  return { buf: Buffer.from(src.base64!, "base64"), name: "document" };
}

export function convert(buf: Buffer) {
  const doc = parseAny(buf);
  const markdown = toMarkdown(doc);
  return {
    doc,
    markdown,
    tables: tablesToJson(doc),
    stats: { format: doc.format, version: doc.version, sections: doc.meta.sections, paragraphs: doc.blocks.filter((b) => b.kind === "paragraph").length, tables: doc.blocks.filter((b) => b.kind === "table").length, images: doc.meta.images, characters: markdown.length },
  };
}
