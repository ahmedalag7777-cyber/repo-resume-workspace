export interface ExtractionEvidence {
  method: "spreadsheet" | "pdf-text" | "ocr" | "docx";
  source: string;
  reviewRequired: boolean;
  warnings: string[];
  confidence?: number;
}

export interface ParseOptions {
  onProgress?: (message: string) => void;
}

export const SUPPORTED_FILE_ACCEPT = ".csv,.tsv,.txt,.json,.xlsx,.xls,.xlsm,.ods,.pdf,.docx,.png,.jpg,.jpeg,.webp";