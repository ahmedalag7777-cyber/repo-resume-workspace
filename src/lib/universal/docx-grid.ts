import type { Cell } from "./types";

/**
 * Extract every HTML table (from a DOCX converted to HTML) into grids.
 * Pure DOM logic — pass any Document (browser DOMParser or jsdom).
 */
export function htmlToGrids(html: string, doc: Document): Cell[][][] {
  const root = doc.createElement("div");
  root.innerHTML = html;
  const grids: Cell[][][] = [];
  for (const table of Array.from(root.querySelectorAll("table")).filter((t) => !t.parentElement?.closest("table"))) {
    const grid: Cell[][] = [];
    const spanning = new Map<number, { value: Cell; remaining: number }>();
    for (const tr of Array.from(table.querySelectorAll("tr")).filter((r) => r.closest("table") === table)) {
      const row: Cell[] = [];
      for (const [column, span] of spanning) {
        row[column] = span.value;
        span.remaining--;
        if (span.remaining <= 0) spanning.delete(column);
      }
      let column = 0;
      for (const cell of Array.from(tr.children).filter((c) => /^(TH|TD)$/.test(c.tagName))) {
        while (row[column] !== undefined) column++;
        const t = (cell.textContent ?? "").trim();
        const value = t === "" ? null : t;
        const width = Math.max(1, Math.min(100, Number(cell.getAttribute("colspan")) || 1));
        const height = Math.max(1, Math.min(100, Number(cell.getAttribute("rowspan")) || 1));
        for (let offset = 0; offset < width; offset++) {
          // Do not duplicate a merged monetary value into adjacent columns.
          const v = offset === 0 ? value : null;
          row[column + offset] = v;
          if (height > 1) spanning.set(column + offset, { value: v, remaining: height - 1 });
        }
        column += width;
      }
      if (row.some((c) => c !== null)) grid.push(row);
    }
    if (grid.length) grids.push(grid);
  }
  return grids;
}

/**
 * Fallback for DOCX files with no tables: paragraphs become a
 * single-column grid so the user still gets the text content.
 */
export function htmlToParagraphGrid(html: string, doc: Document): Cell[][] {
  const root = doc.createElement("div");
  root.innerHTML = html;
  return Array.from(root.querySelectorAll("p, h1, h2, h3, h4, li"))
    .map((el) => (el.textContent ?? "").trim())
    .filter((t) => t !== "")
    .map((t) => [t]);
}
