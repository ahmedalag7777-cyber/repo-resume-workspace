# Document Ingestion Accuracy Architecture

This is the production contract for reading Excel, CSV, PDF, scanned PDF, images and office documents. The objective is not merely OCR text extraction; it is trustworthy structured data extraction with evidence and confidence.

## 1. Parse-once routing

1. Identify MIME type and file signature.
2. Compute SHA-256 and reuse a cached parse result when the exact file is unchanged.
3. Extract native text and embedded tables first.
4. Detect whether pages are image-only or have insufficient native text.
5. OCR only the required pages/regions instead of OCR-ing every page.
6. Normalize the extracted representation into a common document model.
7. Preserve page, bounding-box and source offsets as provenance.

## 2. PDF strategy

Priority order:
- native PDF text extraction;
- native table extraction;
- page rendering only for pages requiring OCR;
- local OCR for image-only regions;
- table reconstruction using detected rows/columns;
- validation against totals, row counts and numeric constraints.

Recommended open-source/local components when compatible with the deployment target:
- PyMuPDF for PDF inspection/rendering/text;
- pdfplumber/Camelot/Tabula for table candidates;
- Tesseract for local OCR;
- OpenCV for deskew, denoise, thresholding and contrast normalization.

## 3. Arabic OCR preprocessing

For Arabic documents, generate preprocessing candidates rather than trusting one OCR pass:
- grayscale;
- adaptive threshold;
- contrast normalization;
- deskew;
- denoise;
- crop margins;
- preserve RTL reading order;
- Arabic/English digit normalization;
- Unicode normalization;
- remove zero-width artifacts;
- conservative diacritic handling.

Run OCR on the best candidate based on confidence and downstream validation. Do not silently rewrite uncertain text.

## 4. Confidence and evidence

Every extracted field should carry:
- source file hash;
- page number;
- bounding box where available;
- extraction method (`native`, `table`, `ocr`);
- confidence;
- normalization operations;
- validation status.

Low-confidence values enter a review queue rather than being silently accepted.

## 5. Numeric and financial validation

For invoices, bank statements and ERP exports:
- parse Arabic and Latin digits;
- recognize decimal and thousands separators according to document locale;
- detect negative/credit notation;
- validate line totals against quantity × unit price when available;
- validate subtotal + tax - discount = total where fields exist;
- compare statement opening + inflows - outflows = closing balance;
- flag mismatches with exact evidence instead of correcting them silently.

## 6. Table reconstruction

Do not rely on OCR text order alone. Infer columns from x-coordinates and repeated row geometry. Detect merged cells and multi-line descriptions. Keep original coordinates so a user can inspect the source region.

## 7. Excel/CSV strategy

Prefer structured parsing over OCR. Detect:
- header row;
- multiple sheets;
- hidden sheets only when explicitly permitted;
- merged cells;
- formulas vs displayed values;
- Arabic/English header synonyms;
- dates, quantities, currencies and SKU types.

Never coerce a SKU into a floating-point number. Preserve leading zeros and normalize only whitespace/unicode differences.

## 8. Safety rule

No external OCR web service is a required dependency. Services such as i2OCR, OnlineOCR, OCR.space and cloud document tools may be offered only as optional adapters in a future release and must display an explicit privacy warning before any upload. Sensitive ERP documents default to local processing.

## 9. Review UX

The ingestion review screen should show:
- original document preview;
- extracted value;
- confidence;
- source page/region;
- validation result;
- normalized value;
- proposed correction;
- accept/reject/edit actions.

The goal is an auditable extraction pipeline, not an opaque OCR textbox.
