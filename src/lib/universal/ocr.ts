import workerPath from "tesseract.js/dist/worker.min.js?url";
import { tsvToGrid } from "./ocr-grid";
import { ocrTextToGrid } from "./pdf-grid";
import type { ParseOptions } from "./extraction";

export async function recognizeImage(image: File | HTMLCanvasElement, options: ParseOptions = {}) {
  const { createWorker } = await import("tesseract.js");
  options.onProgress?.("جارٍ تحميل قارئ الصور العربي والإنجليزي…");
  const worker = await createWorker("ara+eng", 1, {
    workerPath,
    workerBlobURL: false,
    logger: (event) => {
      if (event.status === "recognizing text") options.onProgress?.(`قراءة الصورة… ${Math.round(event.progress * 100)}%`);
    },
  });
  try {
    const { data } = await worker.recognize(image, {}, { text: true, tsv: true });
    const positioned = data.tsv ? tsvToGrid(data.tsv) : [];
    return { grid: positioned.length ? positioned : ocrTextToGrid(data.text), confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}