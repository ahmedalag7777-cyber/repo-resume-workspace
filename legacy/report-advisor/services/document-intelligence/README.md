# Document Intelligence Service

Optional local/server adapter for heavy document parsing. The web app does not depend on this service to function.

## Backends

- `docling` — structured document parsing, PDF layout and tables, OCR-aware processing.
- `paddleocr` — high-accuracy multilingual OCR/document parsing.
- `tesseract` — lightweight OCR fallback.

## Contract

`POST /v1/parse` accepts a local file and returns a normalized document envelope:

```json
{
  "document": {
    "mimeType": "application/pdf",
    "pages": [],
    "blocks": [],
    "tables": [],
    "images": [],
    "metadata": {}
  },
  "engine": "docling",
  "warnings": []
}
```

The envelope is deliberately provider-neutral. Business import code must only consume the normalized envelope and must not import Docling/PaddleOCR directly.

## Security

- Run locally by default.
- Do not expose the service publicly without authentication and request-size limits.
- Treat every parsed field as untrusted input.
- Never persist uploaded bytes by default.
- Enforce MIME/extension validation and archive limits before parsing.
- Return bounded output and page/block limits.

See `docs/OPEN_SOURCE_AI_DOCUMENT_STACK.md` for architecture rules.
