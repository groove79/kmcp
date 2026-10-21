/**
 * HWPX (OWPML, KS X 6101) parser — a ZIP with Contents/header.xml (styles) and Contents/section{n}.xml.
 * Paragraph <hp:p styleIDRef> → runs <hp:run> → <hp:t>; tables <hp:tbl rowCnt colCnt> → <hp:tr> → <hp:tc> (cellAddr/cellSpan) → <hp:subList> → <hp:p>.
 */
import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";
import type { Block, HwpDocument, TableCell } from "./model.js";

type Node = Record<string, unknown> & { ":@"?: Record<string, string>; "#text"?: string };
const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: "", removeNSPrefix: true, trimValues: false, parseTagValue: false });

const tagOf = (n: Node) => Object.keys(n).find((k) => k !== ":@") ?? "";
const kids = (n: Node): Node[] => (n[tagOf(n)] as Node[]) ?? [];
const attrs = (n: Node) => n[":@"] ?? {};

function textOf(n: Node): string {
  const t = tagOf(n);
  if (t === "#text") return String(n["#text"] ?? "");
  if (t === "tab") return "\t";
  if (t === "lineBreak") return "\n";
  if (t === "tbl" || t === "pic" || t === "container" || t === "rect" || t === "line") return ""; // handled separately / ignored
  return kids(n).map(textOf).join("");
}

function* walk(nodes: Node[]): Generator<Node> {
  for (const n of nodes) { yield n; yield* walk(kids(n)); }
}

export function parseHwpx(file: Buffer): HwpDocument {
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(new Uint8Array(file)); } catch { throw new Error("Not an HWPX file: not a valid ZIP container."); }
  const names = Object.keys(files);
  if (!names.some((n) => /^Contents\/section\d+\.xml$/.test(n))) throw new Error("Not an HWPX file: Contents/section0.xml missing.");

  // styles → heading levels
  const headings = new Map<string, number>();
  if (files["Contents/header.xml"]) {
    const h = parser.parse(strFromU8(files["Contents/header.xml"])) as Node[];
    for (const n of walk(h)) {
      if (tagOf(n) === "style") {
        const a = attrs(n);
        const o = (a.name ?? "").match(/^개요\s*(\d)$/) ?? (a.engName ?? "").match(/^Outline\s*(\d)$/i);
        if (o) headings.set(a.id, Number(o[1]));
        else if (/^(제목|Title)$/i.test(a.name ?? a.engName ?? "")) headings.set(a.id, 1);
      }
    }
  }

  const meta: HwpDocument["meta"] = { sections: 0, images: 0, encrypted: false, distribution: false };
  if (files["Contents/content.hpf"]) {
    const hpf = strFromU8(files["Contents/content.hpf"]);
    meta.title = hpf.match(/<dc:title>([^<]*)</)?.[1]?.trim() || undefined;
    meta.author = hpf.match(/<dc:creator>([^<]*)</)?.[1]?.trim() || undefined;
  }

  const blocks: Block[] = [];
  const sections = names.filter((n) => /^Contents\/section\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  for (const name of sections) {
    meta.sections++;
    const xml = parser.parse(strFromU8(files[name])) as Node[];
    const sec = xml.find((n) => tagOf(n) === "sec");
    if (!sec) continue;
    for (const p of kids(sec)) if (tagOf(p) === "p") emitParagraph(p, headings, blocks, meta);
  }
  return { format: "hwpx", blocks, meta };
}

function emitParagraph(p: Node, headings: Map<string, number>, blocks: Block[], meta: HwpDocument["meta"]) {
  const style = attrs(p).styleIDRef ?? "";
  let text = "";
  for (const run of kids(p)) {
    if (tagOf(run) !== "run") continue;
    for (const k of kids(run)) {
      const t = tagOf(k);
      if (t === "t") text += textOf(k);
      else if (t === "tbl") { if (text.trim()) { blocks.push({ kind: "paragraph", text, heading: headings.get(style) ?? 0 }); text = ""; } blocks.push(parseTable(k, headings, meta)); }
      else if (t === "pic") meta.images++;
      else if (t === "container" || t === "rect") { for (const n of walk([k])) if (tagOf(n) === "pic") meta.images++; }
      else text += textOf(k);
    }
  }
  blocks.push({ kind: "paragraph", text, heading: headings.get(style) ?? 0 });
}

function parseTable(tbl: Node, headings: Map<string, number>, meta: HwpDocument["meta"]): Block {
  const a = attrs(tbl);
  const cells: TableCell[] = [];
  let r = 0;
  for (const tr of kids(tbl)) {
    if (tagOf(tr) !== "tr") continue;
    let c = 0;
    for (const tc of kids(tr)) {
      if (tagOf(tc) !== "tc") continue;
      let row = r, col = c, rowSpan = 1, colSpan = 1;
      for (const x of kids(tc)) {
        if (tagOf(x) === "cellAddr") { col = Number(attrs(x).colAddr ?? c); row = Number(attrs(x).rowAddr ?? r); }
        if (tagOf(x) === "cellSpan") { colSpan = Number(attrs(x).colSpan ?? 1); rowSpan = Number(attrs(x).rowSpan ?? 1); }
      }
      const inner: Block[] = [];
      for (const sl of kids(tc)) if (tagOf(sl) === "subList") for (const p of kids(sl)) if (tagOf(p) === "p") emitParagraph(p, headings, inner, meta);
      const text = inner.map((b) => (b.kind === "paragraph" ? b.text : "")).join("\n").trim();
      cells.push({ row, col, rowSpan, colSpan, text });
      c = col + colSpan;
    }
    r++;
  }
  const rows = Number(a.rowCnt ?? r), cols = Number(a.colCnt ?? Math.max(0, ...cells.map((x) => x.col + x.colSpan)));
  return { kind: "table", rows, cols, cells };
}
