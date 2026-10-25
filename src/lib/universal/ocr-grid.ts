import { itemsToGrid } from "./pdf-grid";
import type { Cell } from "./types";

/** Tesseract TSV word boxes: retain spatial columns instead of splitting prose. */
export function tsvToGrid(tsv: string): Cell[][] {
  const lines = new Map<string, { x: number; y: number; end: number; str: string }[]>();
  const anchors = new Map<string, number>();
  for (const row of tsv.trim().split(/\r?\n/)) {
    const c = row.split("\t");
    if (c[0] === "4" && Number.isFinite(Number(c[7]))) anchors.set(c.slice(1, 5).join(":"), Number(c[7]));
    if (c[0] !== "5" || !c[11]?.trim()) continue;
    const x = Number(c[6]), y = Number(c[7]), width = Number(c[8]);
    if (![x, y, width].every(Number.isFinite)) continue;
    const key = c.slice(1, 5).join(":");
    const words = lines.get(key) ?? [];
    words.push({ x, y, end: x + width, str: c.slice(11).join("\t").trim() });
    lines.set(key, words);
  }
  const items: { x: number; y: number; str: string }[] = [];
  for (const [key, words] of lines) {
    words.sort((a, b) => a.x - b.x);
    const lineY = anchors.get(key) ?? Math.min(...words.map((word) => word.y));
    let cell: { x: number; y: number; end: number; str: string } | undefined;
    for (const word of words) {
      if (cell && word.x - cell.end <= 18) { cell.str += ` ${word.str}`; cell.end = word.end; }
      else {
        if (cell) items.push({ x: cell.x, y: -lineY, str: cell.str });
        cell = { ...word };
      }
    }
    if (cell) items.push({ x: cell.x, y: -lineY, str: cell.str });
  }
  return itemsToGrid(items);
}