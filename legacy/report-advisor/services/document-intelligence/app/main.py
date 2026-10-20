from __future__ import annotations

import hashlib
import io
import math
import os
import tempfile
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile

from intermediate_model import Block, DocumentEnvelope, Page, Provenance

app = FastAPI(title="Report Advisor Document Intelligence", version="0.2.0")

MAX_BYTES = int(os.getenv("DOCUMENT_MAX_BYTES", str(50 * 1024 * 1024)))
ALLOWED_MIME = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/tiff",
    "image/webp",
}


def _envelope(data: bytes, filename: str, mime: str, engine: str, warnings: list[str]) -> DocumentEnvelope:
    return DocumentEnvelope(
        schema_version="document-intelligence.v1",
        filename=filename,
        mime_type=mime,
        source_sha256=hashlib.sha256(data).hexdigest(),
        engine=engine,
        status="EXTRACTED",
        metadata={"byte_size": len(data)},
        warnings=warnings,
    )


def parse_with_docling(data: bytes, filename: str, mime: str) -> dict[str, Any] | None:
    """Optional adapter. The canonical intermediate model remains provider-neutral."""
    try:
        from docling.document_converter import DocumentConverter
    except Exception:
        return None
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[1], delete=True) as tmp:
        tmp.write(data)
        tmp.flush()
        result = DocumentConverter().convert(tmp.name)
        document = result.document
        envelope = _envelope(data, filename, mime, "docling", [])
        envelope.metadata["markdown"] = document.export_to_markdown()
        envelope.pages.append(Page(number=1, blocks=[Block(type="document_markdown", text=envelope.metadata["markdown"], confidence=1.0, provenance=Provenance(source_file=filename, source_sha256=envelope.source_sha256, page=1, parser="docling"))]))
        return {"document": envelope.to_dict(), "engine": "docling", "warnings": []}


def _paddle_payload(page_result: Any) -> dict[str, Any] | None:
    """Normalize PaddleOCR 3.x page objects without assuming one SDK representation."""
    payload = getattr(page_result, "json", None)
    payload = payload() if callable(payload) else payload
    if isinstance(payload, str):
        try:
            import json
            payload = json.loads(payload)
        except Exception:
            return None
    if isinstance(payload, dict):
        return payload
    if isinstance(page_result, dict):
        return page_result
    return None


def _paddle_text_and_scores(response: Any) -> tuple[list[str], list[Any]]:
    if not isinstance(response, dict):
        return [], []
    texts = response.get("rec_texts")
    scores = response.get("rec_scores")
    if not isinstance(texts, (list, tuple)):
        texts = []
    if not isinstance(scores, (list, tuple)):
        scores = []
    return list(texts), list(scores)


def parse_with_ocr(data: bytes, filename: str, mime: str) -> dict[str, Any]:
    """PaddleOCR adapter that always returns the canonical document/page/block shape."""
    try:
        from paddleocr import PaddleOCR
    except Exception as exc:
        envelope = _envelope(data, filename, mime, "paddleocr", ["OCR backend is unavailable; extraction is incomplete and requires review."])
        envelope.status = "FAILED"
        envelope.metadata["error_type"] = type(exc).__name__
        return {"document": envelope.to_dict(), "engine": "paddleocr", "warnings": envelope.warnings}

    try:
        from PIL import Image
        image = Image.open(io.BytesIO(data))
        result = PaddleOCR(use_doc_orientation_classify=True, use_doc_unwarping=False, use_textline_orientation=True, lang="arabic").predict(image)
        envelope = _envelope(data, filename, mime, "paddleocr", [])
        pages: list[Page] = []
        invalid_confidence = False

        if result is None:
            result = []
        elif isinstance(result, dict):
            result = [result]
        elif not isinstance(result, (list, tuple)):
            try:
                result = list(result)
            except TypeError:
                result = []

        for page_number, page_result in enumerate(result, start=1):
            payload = _paddle_payload(page_result)
            if payload is None:
                continue
            response = payload.get("res")
            if not isinstance(response, dict):
                response = payload
            texts, scores = _paddle_text_and_scores(response)
            blocks: list[Block] = []
            for index, text in enumerate(texts):
                if not isinstance(text, str) or not text.strip():
                    continue
                score = scores[index] if index < len(scores) else None
                if isinstance(score, bool) or not isinstance(score, (int, float)):
                    invalid_confidence = True
                    confidence = 0.0
                else:
                    numeric_score = float(score)
                    if not math.isfinite(numeric_score) or not 0.0 <= numeric_score <= 1.0:
                        invalid_confidence = True
                        confidence = 0.0
                    else:
                        confidence = numeric_score
                blocks.append(Block(type="ocr_text", text=text.strip(), confidence=confidence, provenance=Provenance(source_file=filename, source_sha256=envelope.source_sha256, page=page_number, parser="paddleocr")))
            if blocks:
                pages.append(Page(number=page_number, blocks=blocks))

        envelope.pages.extend(pages)
        all_blocks = [block for page in pages for block in page.blocks]
        if not all_blocks:
            envelope.warnings.append("OCR backend returned no reliable text; document requires review.")
        elif invalid_confidence:
            envelope.warnings.append("OCR confidence contains invalid or missing values; affected blocks are fail-closed and require review.")
        else:
            minimum = min(block.confidence for block in all_blocks if block.confidence is not None)
            if minimum < 0.7:
                envelope.warnings.append("OCR confidence is below the usable threshold; document requires review.")

        return {"document": envelope.to_dict(), "engine": "paddleocr", "warnings": envelope.warnings}
    except Exception as exc:
        envelope = _envelope(data, filename, mime, "paddleocr", ["OCR execution failed; document is not considered successfully extracted."])
        envelope.status = "FAILED"
        envelope.metadata["error_type"] = type(exc).__name__
        return {"document": envelope.to_dict(), "engine": "paddleocr", "warnings": envelope.warnings}


def parse_fallback(data: bytes, filename: str, mime: str, *, ocr_required: bool = False) -> dict[str, Any]:
    text = data.decode("utf-8", errors="replace") if mime.startswith("text/") else ""
    warnings = ["No optional structured document backend was available."]
    if ocr_required:
        warnings = ["OCR is required for this document but no OCR backend is available; extraction is incomplete and requires review."]
    envelope = _envelope(data, filename, mime, "fallback", warnings)
    if text:
        envelope.pages.append(Page(number=1, blocks=[Block(type="text", text=text, provenance=Provenance(source_file=filename, source_sha256=envelope.source_sha256, page=1, parser="fallback"))]))
    return {"document": envelope.to_dict(), "engine": "fallback", "warnings": envelope.warnings}


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "document-intelligence", "model": "document-intelligence.v1"}


@app.post("/v1/parse")
async def parse_document(file: UploadFile = File(...)) -> dict[str, Any]:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail="Unsupported document type")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Document exceeds configured size limit")
    filename = file.filename or "document"
    result = parse_with_docling(data, filename, file.content_type)
    if result:
        return result
    if file.content_type.startswith("image/") or file.content_type == "application/pdf":
        return parse_with_ocr(data, filename, file.content_type)
    return parse_fallback(data, filename, file.content_type)