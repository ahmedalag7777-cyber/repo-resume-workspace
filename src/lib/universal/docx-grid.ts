import type { Cell } from "./types";

/**
 * Extract every HTML table (from a DOCX converted to HTML) into grids.
 * Pure DOM logic — pass any Document (browser DOMParser or jsdom).
 */
export function htmlToGrids(html: string, doc: Document): Cell[][][] {
  const root = doc.createElement("div");
  root.innerHTML = html;
  const grids: Cell[][][] = [];
  for (const table of Array.from(root.querySelectorAll("table"))) {
    const grid: Cell[][] = [];
    for (const tr of Array.from(table.querySelectorAll("tr"))) {
      const row = Array.from(tr.querySelectorAll("th,td")).map((cell) => {
        const t = (cell.textContent ?? "").trim();
        return t === "" ? null : t;
      });
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
