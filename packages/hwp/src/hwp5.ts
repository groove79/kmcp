/**
 * HWP 5.x (binary, CFB container) parser — text, outline headings, tables.
 *
 * Layout (한글 문서 파일 형식 5.0 공개 문서):
 *   FileHeader            256 bytes: signature "HWP Document File", version u32, flags u32 (bit0 compressed, bit1 password, bit2 distribution)
 *   DocInfo               record stream (zlib raw-deflate when compressed)
 *   BodyText/Section{n}   record stream per section
 * Record header: u32 = tagId(10) | level(10) | size(12); size 0xFFF → next u32 is the size.
 */
import CFB from "cfb";
import { inflateRawSync } from "node:zlib";
import type { Block, HwpDocument, Paragraph, TableCell } from "./model.js";

/** Max bytes of one decompressed stream (DocInfo / BodyText section). */
export const MAX_STREAM_BYTES = 64 * 1024 * 1024;

const TAG = {
  BEGIN: 0x10,
  get STYLE() { return this.BEGIN + 19; },
  get PARA_HEADER() { return this.BEGIN + 50; },
  get PARA_TEXT() { return this.BEGIN + 51; },
  get CTRL_HEADER() { return this.BEGIN + 55; },
  get LIST_HEADER() { return this.BEGIN + 56; },
  get TABLE() { return this.BEGIN + 61; },
  get SHAPE_PICTURE() { return this.BEGIN + 69; },
};

interface Rec { tag: number; level: number; data: Buffer }

export function readRecords(buf: Buffer): Rec[] {
  const out: Rec[] = [];
  let p = 0;
  while (p + 4 <= buf.length) {
    const h = buf.readUInt32LE(p); p += 4;
    const tag = h & 0x3ff, level = (h >>> 10) & 0x3ff;
    let size = (h >>> 20) & 0xfff;
    if (size === 0xfff) { size = buf.readUInt32LE(p); p += 4; }
    out.push({ tag, level, data: buf.subarray(p, p + size) });
    p += size;
  }
  return out;
}

/** Control characters: which ones take 8 WCHARs (16 bytes) vs 1. */
const WIDE_CTRL = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);

export function decodeParaText(data: Buffer): { text: string; hasTable: boolean } {
  let s = "";
  let hasTable = false;
  for (let i = 0; i + 1 < data.length; ) {
    const c = data.readUInt16LE(i);
    if (c < 32) {
      if (c === 9) s += "\t";
      else if (c === 10) s += "\n";
      else if (c === 13) s += "\n";
      else if (c === 30 || c === 31) s += " ";
      else if (c === 24) s += "-";
      if (c === 11) {
        // extended control: next 4 bytes after the code hold the ctrl id (little-endian chars)
        const id = data.subarray(i + 2, i + 6).toString("latin1").split("").reverse().join("");
        if (id === "tbl ") hasTable = true;
      }
      i += WIDE_CTRL.has(c) ? 16 : 2;
    } else {
      s += String.fromCharCode(c);
      i += 2;
    }
  }
  return { text: s, hasTable };
}

function readStream(cfb: CFB.CFB$Container, name: string, compressed: boolean): Buffer | null {
  const e = CFB.find(cfb, name) ?? CFB.find(cfb, "/" + name) ?? CFB.find(cfb, "Root Entry/" + name);
  if (!e) return null;
  const raw = Buffer.from(e.content as Uint8Array);
  if (!compressed) return raw;
  // Cap decompressed size (inflate bombs): a real section stream is far below this.
  const opts = { maxOutputLength: MAX_STREAM_BYTES };
  try { return inflateRawSync(raw, opts); } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ERR_BUFFER_TOO_LARGE" || /maxOutputLength|buffer too large/i.test(String(e))) throw new Error("HWP stream too large after decompression.");
    try { return inflateRawSync(raw.subarray(2), opts); } catch { return raw; }
  }
}

/** Map styleId → heading level using DocInfo STYLE names ("개요 1" … "개요 7", "제목"). */
function headingMap(docInfo: Buffer | null): Map<number, number> {
  const m = new Map<number, number>();
  if (!docInfo) return m;
  let idx = 0;
  for (const r of readRecords(docInfo)) {
    if (r.tag !== TAG.STYLE) continue;
    try {
      const n = r.data.readUInt16LE(0);
      const name = r.data.subarray(2, 2 + n * 2).toString("utf16le");
      const o = name.match(/^개요\s*(\d)$/) ?? name.match(/^Outline\s*(\d)$/i);
      if (o) m.set(idx, Number(o[1]));
      else if (/^(제목|Title)$/i.test(name)) m.set(idx, 1);
    } catch { /* ignore malformed */ }
    idx++;
  }
  return m;
}

export function parseHwp5(file: Buffer): HwpDocument {
  const cfb = CFB.read(file, { type: "buffer" });
  const header = CFB.find(cfb, "FileHeader");
  if (!header) throw new Error("Not an HWP 5.x file: FileHeader stream missing.");
  const hb = Buffer.from(header.content as Uint8Array);
  const sig = hb.subarray(0, 17).toString("latin1");
  if (!sig.startsWith("HWP Document File")) throw new Error("Not an HWP 5.x file: bad signature.");
  const ver = hb.readUInt32LE(32);
  const version = `${(ver >>> 24) & 0xff}.${(ver >>> 16) & 0xff}.${(ver >>> 8) & 0xff}.${ver & 0xff}`;
  const flags = hb.readUInt32LE(36);
  const compressed = !!(flags & 1), encrypted = !!(flags & 2), distribution = !!(flags & 4);
  if (encrypted) throw new Error("This HWP file is password-protected; remove the password in 한글 and try again.");
  if (distribution) throw new Error("This is a 배포용(distribution) HWP file, which is encrypted; export it as a normal HWP/HWPX or PDF first.");

  const docInfo = readStream(cfb, "DocInfo", compressed);
  const headings = headingMap(docInfo);

  // Summary info (title/author) lives in \x05HwpSummaryInformation — optional, best effort.
  const meta: HwpDocument["meta"] = { sections: 0, images: 0, encrypted, distribution };
  const summary = CFB.find(cfb, "\u0005HwpSummaryInformation");
  if (summary) {
    const txt = Buffer.from(summary.content as Uint8Array).toString("utf16le").replace(/\u0000+/g, "\n");
    const lines = txt.split("\n").map((s) => s.trim()).filter((s) => s.length > 1 && /[\p{L}\p{N}]/u.test(s));
    if (lines[0]) meta.title = lines[0];
  }

  const blocks: Block[] = [];
  for (let s = 0; ; s++) {
    const sec = readStream(cfb, `BodyText/Section${s}`, compressed);
    if (!sec) break;
    meta.sections++;
    blocks.push(...parseSection(readRecords(sec), headings, meta));
  }
  return { format: "hwp", version, blocks, meta };
}

function parseSection(recs: Rec[], headings: Map<number, number>, meta: HwpDocument["meta"]): Block[] {
  const blocks: Block[] = [];
  // Real-file layout (verified against 한글 2018+ output):
  //   PARA_HEADER(L) PARA_TEXT(L+1) … CTRL_HEADER 'tbl '(L+1) TABLE(L+2)
  //   then for each cell: LIST_HEADER(L+2) PARA_HEADER(L+2) PARA_TEXT(L+3) …
  //   the table ends at the first record with level < L+2.
  let table: { rows: number; cols: number; cells: TableCell[]; level: number; cell: TableCell | null } | null = null;
  let curPara: Paragraph | null = null;

  const flushTable = () => { if (table) { blocks.push({ kind: "table", rows: table.rows, cols: table.cols, cells: table.cells }); table = null; } };

  for (const r of recs) {
    if (table && r.level < table.level) flushTable();
    switch (r.tag) {
      case TAG.PARA_HEADER: {
        const styleId = r.data.length >= 12 ? r.data.readUInt8(10) : 0; // nChars u32, controlMask u32, paraShapeId u16, styleId u8
        if (table) {
          if (table.cell && table.cell.text && r.level === table.level) table.cell.text += "\n"; // new paragraph inside the same cell
          break;
        }
        curPara = { kind: "paragraph", text: "", heading: headings.get(styleId) ?? 0 };
        blocks.push(curPara);
        break;
      }
      case TAG.PARA_TEXT: {
        const { text } = decodeParaText(r.data);
        if (table) { if (table.cell) table.cell.text += text; }
        else if (curPara) curPara.text += text;
        break;
      }
      case TAG.TABLE: {
        if (table) break; // nested table: flatten its text into the current cell
        const rows = r.data.readUInt16LE(4), cols = r.data.readUInt16LE(6);
        table = { rows, cols, cells: [], level: r.level, cell: null };
        break;
      }
      case TAG.LIST_HEADER: {
        if (table && r.level === table.level && r.data.length >= 16) {
          // u16 nParas, u32 attr, u16 (reserved), then cell: u16 col, u16 row, u16 colSpan, u16 rowSpan, u32 width, u32 height …
          const col = r.data.readUInt16LE(8), row = r.data.readUInt16LE(10), colSpan = r.data.readUInt16LE(12), rowSpan = r.data.readUInt16LE(14);
          table.cell = { row, col, rowSpan: Math.max(1, rowSpan), colSpan: Math.max(1, colSpan), text: "" };
          table.cells.push(table.cell);
        }
        break;
      }
      case TAG.SHAPE_PICTURE: meta.images++; break;
      default: break;
    }
  }
  flushTable();
  return blocks;
}
