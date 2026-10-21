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

export function tableToMarkdown(t: Table): string[] {
  // Expand spans by repeating the cell text so every row has `cols` cells (Markdown has no colspan).
  const grid: string[][] = Array.from({ length: t.rows }, () => Array<string>(t.cols).fill(""));
  for (const c of t.cells) {
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
  return doc.blocks.filter((b): b is Table => b.kind === "table").map((t) => {
    const grid: string[][] = Array.from({ length: t.rows }, () => Array<string>(t.cols).fill(""));
    for (const c of t.cells) if (c.row < t.rows && c.col < t.cols) grid[c.row][c.col] = c.text.trim();
    return grid;
  });
}
