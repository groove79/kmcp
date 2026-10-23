/** Format-independent document model that both the HWP and HWPX parsers produce, and the Markdown renderer consumes. */

export interface Paragraph {
  kind: "paragraph";
  text: string;
  /** 1..6 when the paragraph uses an outline ("개요 n") style; 0 otherwise */
  heading: number;
}

export interface TableCell {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  text: string;
}

export interface Table {
  kind: "table";
  rows: number;
  cols: number;
  cells: TableCell[];
}

export type Block = Paragraph | Table;

export interface HwpDocument {
  format: "hwp" | "hwpx";
  version?: string;
  blocks: Block[];
  meta: { title?: string; author?: string; created?: string; modified?: string; sections: number; images: number; encrypted: boolean; distribution: boolean };
}

/** Render the model as GitHub-flavoured Markdown. */
export function toMarkdown(doc: HwpDocument): string {
  const out: string[] = [];
  for (const b of doc.blocks) {
    if (b.kind === "paragraph") {
      const t = b.text.replace(/\s+$/g, "");
      if (!t.trim()) { if (out.length && out.at(-1) !== "") out.push(""); continue; }
      if (b.heading) { if (out.length && out.at(-1) !== "") out.push(""); out.push(`${"#".repeat(Math.min(6, b.heading))} ${t.trim()}`, ""); }
      else out.push(t);
    } else {
      out.push("", ...tableToMarkdown(b), "");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** Hard limits so a tiny crafted file cannot allocate a billion-cell grid or spin the CPU. */
export const MAX_TABLE_DIM = 1000;
export const MAX_TABLE_CELLS = 200_000;
const MAX_SPAN_WORK = 2_000_000;
const int = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** Clamp declared size to real content and limits; drop out-of-range cells; clamp spans. Throws if still too large. */
export function normalizeTable(t: Table): Table {
  const cells0 = t.cells.length > MAX_TABLE_CELLS ? t.cells.slice(0, MAX_TABLE_CELLS) : t.cells;
  let maxR = 0, maxC = 0;
  for (const c of cells0) { const r = int(c.row + 1), k = int(c.col + 1); if (r <= MAX_TABLE_DIM && k <= MAX_TABLE_DIM) { maxR = Math.max(maxR, r); maxC = Math.max(maxC, k); } }
  let rows = Math.min(MAX_TABLE_DIM, int(t.rows) || maxR), cols = Math.min(MAX_TABLE_DIM, int(t.cols) || maxC);
  if (rows * cols > MAX_TABLE_CELLS) { rows = Math.min(rows, Math.max(maxR, 1)); cols = Math.min(cols, Math.max(maxC, 1)); }
  if (rows * cols > MAX_TABLE_CELLS) throw new Error(`Table too large (${rows}×${cols}).`);
  const cells: TableCell[] = [];
  for (const c of cells0) {
    const row = Number.isFinite(c.row) && c.row >= 0 ? Math.floor(c.row) : -1, col = Number.isFinite(c.col) && c.col >= 0 ? Math.floor(c.col) : -1;
    if (row < 0 || col < 0 || row >= rows || col >= cols) continue;
    cells.push({ ...c, row, col, rowSpan: Math.min(Math.max(1, int(c.rowSpan) || 1), rows - row), colSpan: Math.min(Math.max(1, int(c.colSpan) || 1), cols - col) });
  }
  return { ...t, rows, cols, cells };
}

export function tableToMarkdown(t0: Table): string[] {
  const t = normalizeTable(t0);
  // Expand spans by repeating the cell text so every row has `cols` cells (Markdown has no colspan).
  const grid: string[][] = Array.from({ length: t.rows }, () => Array<string>(t.cols).fill(""));
  let work = 0;
  for (const c of t.cells) {
    if (work > MAX_SPAN_WORK) { grid[c.row][c.col] = c.text; continue; } // stop expanding spans on pathological input
    work += c.rowSpan * c.colSpan;
    for (let r = c.row; r < Math.min(t.rows, c.row + c.rowSpan); r++) {
      for (let k = c.col; k < Math.min(t.cols, c.col + c.colSpan); k++) {
        grid[r][k] = r === c.row && k === c.col ? c.text : grid[r][k] || (c.rowSpan > 1 && k === c.col ? "〃" : "");
      }
    }
  }
  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n+/g, " ").trim();
  const lines = grid.map((row) => `| ${row.map(esc).join(" | ")} |`);
  if (lines.length === 0) return [];
  lines.splice(1, 0, `| ${Array(t.cols).fill("---").join(" | ")} |`);
  return lines;
}

/** Tables as plain arrays (for agents that want data, not prose). */
export function tablesToJson(doc: HwpDocument): string[][][] {
  return doc.blocks.filter((b): b is Table => b.kind === "table").map((t0) => {
    const t = normalizeTable(t0);
    const grid: string[][] = Array.from({ length: t.rows }, () => Array<string>(t.cols).fill(""));
    for (const c of t.cells) if (c.row < t.rows && c.col < t.cols) grid[c.row][c.col] = c.text.trim();
    return grid;
  });
}
