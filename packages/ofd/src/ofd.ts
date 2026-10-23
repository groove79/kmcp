/**
 * OFD (GB/T 33190-2016, China's fixed-layout document format — e-invoices 电子发票/数电票, official documents) reader.
 * An OFD is a ZIP: OFD.xml → DocRoot (Doc_N/Document.xml) → Pages (Page_N/Content.xml, optional template pages) → TextObject/TextCode.
 * We rebuild lines from text positions and resolve CustomTags (invoice fields that point at text object IDs).
 */
import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";

type Node = Record<string, unknown> & { ":@"?: Record<string, string>; "#text"?: string };
const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: "", removeNSPrefix: true, trimValues: false, parseTagValue: false });
const parseXml = (xml: string) => { if (/<!(DOCTYPE|ENTITY)/i.test(xml)) throw new Error("Unsupported OFD: XML entity declarations are not allowed."); return parser.parse(xml) as Node[]; };

export const MAX_PART_BYTES = 32 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 96 * 1024 * 1024;
const MAX_PAGES = 500;

const tagOf = (n: Node) => Object.keys(n).find((k) => k !== ":@") ?? "";
const kids = (n: Node): Node[] => (Array.isArray(n[tagOf(n)]) ? (n[tagOf(n)] as Node[]) : []);
const attrs = (n: Node) => n[":@"] ?? {};
const text = (n: Node): string => (tagOf(n) === "#text" ? String(n["#text"] ?? "") : kids(n).map(text).join(""));
function* walk(nodes: Node[]): Generator<Node> { for (const n of nodes) { yield n; yield* walk(kids(n)); } }
const find = (nodes: Node[], tag: string) => { for (const n of walk(nodes)) if (tagOf(n) === tag) return n; return null; };
const findAll = (nodes: Node[], tag: string) => [...walk(nodes)].filter((n) => tagOf(n) === tag);

/** Resolve an OFD path (absolute "/Doc_0/x" or relative to a base dir), case-insensitively against zip entries. */
function resolver(files: Record<string, Uint8Array>) {
  const lower = new Map(Object.keys(files).map((k) => [k.toLowerCase(), k]));
  return (base: string, loc: string): string | null => {
    const clean = loc.trim().replace(/\\/g, "/");
    const parts = (clean.startsWith("/") ? clean.slice(1) : (base ? base + "/" : "") + clean).split("/");
    const out: string[] = [];
    for (const p of parts) { if (p === "..") out.pop(); else if (p && p !== ".") out.push(p); }
    return lower.get(out.join("/").toLowerCase()) ?? null;
  };
}
const dirOf = (p: string) => p.split("/").slice(0, -1).join("/");

export interface TextItem { id: string; x: number; y: number; text: string; size: number }
export interface OfdPage { index: number; lines: string[]; items: TextItem[] }
export interface OfdDocument {
  meta: { title?: string; author?: string; subject?: string; creator?: string; creationDate?: string; docId?: string; pageCount: number; signed: boolean; attachments: string[] };
  pages: OfdPage[];
  tags: Record<string, string>;
}

function textItems(nodes: Node[]): TextItem[] {
  const out: TextItem[] = [];
  for (const obj of findAll(nodes, "TextObject")) {
    const a = attrs(obj);
    const [bx, by] = (a.Boundary ?? "0 0 0 0").split(/\s+/).map(Number);
    const size = Number(a.Size ?? 3.5);
    let s = "", fx = NaN, fy = NaN;
    for (const tc of findAll(kids(obj), "TextCode")) {
      const ta = attrs(tc);
      if (Number.isNaN(fx)) { fx = Number(ta.X ?? 0); fy = Number(ta.Y ?? 0); }
      s += text(tc);
    }
    if (s.trim()) out.push({ id: a.ID ?? "", x: bx + (Number.isNaN(fx) ? 0 : fx), y: by + (Number.isNaN(fy) ? 0 : fy), text: s, size });
  }
  return out;
}

/** Group items into reading-order lines: by baseline (tolerance ~ half a glyph), then left→right with a space for gaps. */
export function toLines(items: TextItem[]): string[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: TextItem[][] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= Math.max(1, Math.min(last[0].size, it.size) * 0.5)) last.push(it);
    else lines.push([it]);
  }
  return lines.map((l) => l.sort((a, b) => a.x - b.x).map((i) => i.text.trim()).filter(Boolean).join("  ")).filter(Boolean);
}

export function parseOfd(file: Buffer | Uint8Array): OfdDocument {
  let files: Record<string, Uint8Array>;
  let tooBig = false, total = 0;
  try {
    files = unzipSync(new Uint8Array(file), {
      filter: (f) => {
        if (!/\.xml$/i.test(f.name)) return false;
        if (f.originalSize > MAX_PART_BYTES || (total += f.originalSize) > MAX_TOTAL_BYTES) { tooBig = true; return false; }
        return true;
      },
    });
  } catch {
    throw new Error("Not an OFD file (expected a ZIP container with OFD.xml).");
  }
  if (tooBig) throw new Error("OFD part too large (zip bomb protection: 32MB per part, 96MB total).");
  const resolve = resolver(files);
  const root = resolve("", "OFD.xml");
  if (!root) throw new Error("Not an OFD file: OFD.xml is missing.");
  const ofd = parseXml(strFromU8(files[root]));
  const info = find(ofd, "DocInfo");
  const metaText = (tag: string) => { const n = info ? find(kids(info), tag) : null; return n ? text(n).trim() || undefined : undefined; };
  const docRootLoc = find(ofd, "DocRoot");
  if (!docRootLoc) throw new Error("OFD.xml has no DocRoot.");
  const docPath = resolve("", text(docRootLoc));
  if (!docPath) throw new Error(`Document.xml not found at ${text(docRootLoc)}`);
  const docDir = dirOf(docPath);
  const doc = parseXml(strFromU8(files[docPath]));

  const templates = new Map<string, TextItem[]>();
  for (const t of findAll(doc, "TemplatePage")) {
    const a = attrs(t);
    const p = a.BaseLoc ? resolve(docDir, a.BaseLoc) : null;
    if (p) templates.set(a.ID, textItems(parseXml(strFromU8(files[p]))));
  }

  const pages: OfdPage[] = [];
  const byId = new Map<string, string>();
  const pageNodes = findAll(doc, "Page").filter((p) => attrs(p).BaseLoc).slice(0, MAX_PAGES);
  pageNodes.forEach((pn, i) => {
    const p = resolve(docDir, attrs(pn).BaseLoc);
    if (!p) return;
    const content = parseXml(strFromU8(files[p]));
    const tplIds = findAll(content, "Template").map((t) => attrs(t).TemplateID);
    const items = [...tplIds.flatMap((id) => templates.get(id) ?? []), ...textItems(content)];
    for (const it of items) if (it.id) byId.set(it.id, (byId.get(it.id) ?? "") + it.text);
    pages.push({ index: i + 1, items, lines: toLines(items) });
  });

  // CustomTags: Document.xml → <CustomTags>Tags/CustomTags.xml</CustomTags> → <CustomTag><FileLoc>…</FileLoc>
  const tags: Record<string, string> = {};
  const ctLoc = find(doc, "CustomTags");
  const ctPath = ctLoc ? resolve(docDir, text(ctLoc)) : null;
  if (ctPath) {
    const ct = parseXml(strFromU8(files[ctPath]));
    for (const tag of findAll(ct, "CustomTag")) {
      const fl = find(kids(tag), "FileLoc");
      const fp = fl ? resolve(dirOf(ctPath), text(fl)) : null;
      if (!fp) continue;
      const tree = parseXml(strFromU8(files[fp]));
      const visit = (n: Node, pathParts: string[]) => {
        const t = tagOf(n);
        if (!t || t === "#text" || t === "?xml") return;
        const children = kids(n);
        const refs = children.filter((c) => tagOf(c) === "ObjectRef");
        if (refs.length) { tags[[...pathParts, t].slice(1).join(".") || t] = refs.map((r) => byId.get(text(r).trim()) ?? "").join("").trim(); return; }
        const elems = children.filter((c) => !["#text"].includes(tagOf(c)));
        if (!elems.length) { const v = text(n).trim(); if (v) tags[[...pathParts, t].slice(1).join(".") || t] = v; return; }
        for (const c of elems) visit(c, [...pathParts, t]);
      };
      for (const n of tree) visit(n, []);
    }
  }

  const attachments = Object.keys(files).filter((f) => /\/Attachs?\//i.test(f));
  return {
    meta: {
      title: metaText("Title"), author: metaText("Author"), subject: metaText("Subject"), creator: metaText("Creator"), creationDate: metaText("CreationDate"), docId: metaText("DocID"),
      pageCount: pages.length, signed: Object.keys(files).some((f) => /Signs?\//i.test(f)), attachments,
    },
    pages, tags,
  };
}

export function toText(d: OfdDocument): string {
  return d.pages.map((p) => (d.pages.length > 1 ? `--- page ${p.index} ---\n` : "") + p.lines.join("\n")).join("\n\n");
}

// Common e-invoice field names (国家税务总局 OFD e-invoice CustomTag) → plain English keys
const INVOICE_KEYS: Array<[RegExp, string]> = [
  [/(^|\.)InvoiceCode$/i, "invoiceCode"], [/(^|\.)InvoiceNo$/i, "invoiceNumber"], [/(^|\.)IssueDate$/i, "issueDate"], [/(^|\.)InvoiceCheckCode$/i, "checkCode"],
  [/(^|\.)BuyerName$/i, "buyerName"], [/(^|\.)BuyerTaxID$/i, "buyerTaxId"], [/(^|\.)SellerName$/i, "sellerName"], [/(^|\.)SellerTaxID$/i, "sellerTaxId"],
  [/(^|\.)TaxExclusiveTotalAmount$/i, "amountExcludingTax"], [/(^|\.)TaxTotalAmount$/i, "taxAmount"], [/(^|\.)TaxInclusiveTotalAmount$/i, "totalIncludingTax"],
  [/(^|\.)Note$/i, "note"], [/(^|\.)InvoiceClerk$/i, "issuer"], [/(^|\.)MachineNo$/i, "machineNo"],
];

/** Pick invoice fields from CustomTags; fall back to label scanning of the text (发票号码：…). */
export function invoiceFields(d: OfdDocument): { fields: Record<string, string>; source: "tags" | "text" | "none"; rawTags: Record<string, string> } {
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(d.tags)) for (const [re, key] of INVOICE_KEYS) if (re.test(k) && v && !fields[key]) fields[key] = v;
  if (Object.keys(fields).length) return { fields, source: "tags", rawTags: d.tags };
  const all = toText(d);
  const grab = (re: RegExp) => all.match(re)?.[1]?.trim();
  const pairs: Array<[string, RegExp]> = [
    ["invoiceCode", /发票代码[:：]?\s*([0-9]{10,12})/], ["invoiceNumber", /发票号码[:：]?\s*([0-9]{8,20})/], ["issueDate", /开票日期[:：]?\s*([0-9]{4}\s*年\s*[0-9]{1,2}\s*月\s*[0-9]{1,2}\s*日|[0-9]{4}-[0-9]{2}-[0-9]{2})/],
    ["checkCode", /校\s*验\s*码[:：]?\s*([0-9\s]{10,})/], ["totalIncludingTax", /[（(]小写[）)]\s*[¥￥]?\s*([0-9.,]+)/],
  ];
  for (const [k, re] of pairs) { const v = grab(re); if (v) fields[k] = v; }
  return { fields, source: Object.keys(fields).length ? "text" : "none", rawTags: d.tags };
}
