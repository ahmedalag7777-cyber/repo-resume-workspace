import { itemsToGrid } from "./pdf-grid";
import type { Cell } from "./types";

/** Tesseract TSV word boxes: retain spatial columns instead of splitting prose. */
export function tsvToGrid(tsv: string): Cell[][] {
  const lines = new Map<string, { x: number; y: number; end: number; str: string }[]>();
  for (const row of tsv.trim().split(/\r?\n/).slice(1)) {
    const c = row.split("\t");
    if (c[0] !== "5" || !c[11]?.trim()) continue;
    const x = Number(c[6]), y = Number(c[7]), width = Number(c[8]);
    if (![x, y, width].every(Number.isFinite)) continue;
    const key = c.slice(1, 6).join(":");
    const words = lines.get(key) ?? [];
    words.push({ x, y, end: x + width, str: c.slice(11).join("\t").trim() });
    lines.set(key, words);
  }
  const items: { x: number; y: number; str: string }[] = [];
  for (const words of lines.values()) {
    words.sort((a, b) => a.x - b.x);
    let cell: { x: number; y: number; end: number; str: string } | undefined;
    for (const word of words) {
      if (cell && word.x - cell.end <= 18) { cell.str += ` ${word.str}`; cell.end = word.end; }
      else {
        if (cell) items.push({ x: cell.x, y: -cell.y, str: cell.str });
        cell = { ...word };
      }
    }
    if (cell) items.push({ x: cell.x, y: -cell.y, str: cell.str });
  }
  return itemsToGrid(items);
}