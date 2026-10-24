import type { Cell } from "./types";

/** A positioned text fragment extracted from a PDF page (or OCR). */
export interface TextItem {
  x: number;
  y: number;
  str: string;
}

export interface TextLine {
  y: number;
  items: TextItem[];
}

/**
 * Group positioned text items into visual lines.
 * PDF y-coordinates grow upward, so lines are sorted top→bottom (y descending)
 * and items within a line left→right (x ascending).
 */
export function groupToLines(items: TextItem[], yTolerance = 3): TextLine[] {
  const sorted = items
    .filter((it) => it.str.trim() !== "")
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextLine[] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - it.y) <= yTolerance) {
      last.items.push(it);
      // keep the line anchored to the average y to avoid drift on long lines
      last.y = (last.y * (last.items.length - 1) + it.y) / last.items.length;
    } else {
      lines.push({ y: it.y, items: [it] });
    }
  }
  for (const l of lines) l.items.sort((a, b) => a.x - b.x);
  return lines;
}

/**
 * Reconstruct a table grid from text lines by clustering the x-start
 * positions of fragments across all lines into columns.
 */
export function linesToGrid(lines: TextLine[], xTolerance = 10): Cell[][] {
  const xs: number[] = [];
  for (const l of lines) for (const it of l.items) xs.push(it.x);
  xs.sort((a, b) => a - b);

  const clusters: number[] = [];
  for (const x of xs) {
    const last = clusters[clusters.length - 1];
    if (last === undefined || x - last > xTolerance) clusters.push(x);
    else clusters[clusters.length - 1] = (last + x) / 2;
  }
  if (!clusters.length) return [];

  const colOf = (x: number): number => {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      const d = Math.abs(clusters[i]! - x);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  };

  return lines.map((l) => {
    const row: Cell[] = new Array(clusters.length).fill(null);
    for (const it of l.items) {
      const c = colOf(it.x);
      row[c] = row[c] === null ? it.str.trim() : `${row[c]} ${it.str.trim()}`;
    }
    return row;
  });
}

/** Full pipeline: positioned items → grid. */
export function itemsToGrid(items: TextItem[]): Cell[][] {
  return linesToGrid(groupToLines(items));
}

/**
 * Turn plain OCR text into a grid: one line per row, cells split on tabs
 * or runs of 2+ spaces. Single-column lines stay single-cell rows.
 */
export function ocrTextToGrid(text: string): Cell[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "")
    .map((l) => l.split(/\t| {2,}/).map((c) => c.trim()).filter((c) => c !== ""));
}
