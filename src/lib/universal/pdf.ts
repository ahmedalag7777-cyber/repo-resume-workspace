import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { itemsToGrid } from "./pdf-grid";
import { gridToTable } from "./parse";
import { recognizeImage } from "./ocr";
import type { ParseOptions } from "./extraction";
import type { RawTable } from "./types";

export async function parsePdf(file: File, options: ParseOptions = {}): Promise<RawTable[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  const pdf = await task.promise;
  const tables: RawTable[] = [];
  try {
    for (let number = 1; number <= pdf.numPages; number++) {
      options.onProgress?.(`قراءة PDF — صفحة ${number} من ${pdf.numPages}`);
      const page = await pdf.getPage(number);
      const text = await page.getTextContent();
      const items = text.items.flatMap((item) => "str" in item && item.str.trim()
        ? [{ x: item.transform[4] ?? 0, y: item.transform[5] ?? 0, str: item.str }] : []);
      let grid = itemsToGrid(items);
      let confidence: number | undefined;
      const scanned = items.length === 0;
      if (scanned) {
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2, 2600 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("تعذر تجهيز صفحة PDF للقراءة");
        await page.render({ canvasContext: context, canvas, viewport }).promise;
        const ocr = await recognizeImage(canvas, options);
        grid = ocr.grid; confidence = ocr.confidence;
        canvas.width = 0; canvas.height = 0;
      }
      if (grid.length && grid.some((row) => row.filter((c) => c !== null).length >= 2)) {
        const source = `صفحة ${number}`;
        const table = gridToTable(grid, source);
        if (table.rows.length) tables.push({ ...table, extraction: {
          method: scanned ? "ocr" : "pdf-text", source, reviewRequired: true, ...(confidence === undefined ? {} : { confidence }),
          warnings: ["الأعمدة مستنتجة من مواضع النص؛ راجعها قبل اعتماد الأرقام.", "كل صفحة مستقلة؛ لا تُدمج الصفحات تلقائياً.", "الصفوف تشير إلى ترتيب السطور المستخرجة، وليس إحداثيات المستند الأصلية."],
        } });
      }
      page.cleanup();
    }
  } finally { await task.destroy(); }
  if (!tables.length) throw new Error("لم يُكتشف جدول قابل للمراجعة في PDF؛ النص الحر لا يكفي لتحليل مالي موثوق.");
  return tables;
}