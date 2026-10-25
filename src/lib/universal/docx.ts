import { htmlToGrids } from "./docx-grid";
import { gridToTable } from "./parse";
import type { RawTable } from "./types";

export async function parseDocx(file: File): Promise<RawTable[]> {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  // Detached DOM only; never render converted HTML or fetch its embedded media.
  const doc = new DOMParser().parseFromString("", "text/html");
  const grids = htmlToGrids(result.value, doc);
  if (!grids.length) throw new Error("مستند Word لا يحتوي على جدول؛ لن نحول النص الحر إلى أرقام تجارية مفترضة.");
  return grids.map((grid, i) => ({
    ...gridToTable(grid, `جدول ${i + 1}`),
    extraction: { method: "docx" as const, source: `جدول ${i + 1}`, reviewRequired: true,
      warnings: ["راجع ترتيب الأعمدة والخلايا المدمجة؛ لا تُحفظ هيئة مستند Word الأصلية.", ...result.messages.map((m) => m.message)] },
  })).filter((table) => table.rows.length > 0);
}