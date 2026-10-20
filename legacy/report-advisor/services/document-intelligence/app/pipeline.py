from __future__ import annotations

import hashlib
import math
from dataclasses import asdict, dataclass
from typing import Any, Callable

from .contracts import DocumentEnvelope, ProcessingState


@dataclass(frozen=True)
class Inspection:
    filename: str
    mime_type: str
    byte_size: int
    source_sha256: str
    extension: str
    is_text: bool
    is_image: bool
    is_pdf: bool


@dataclass(frozen=True)
class RouteDecision:
    route: str
    reason: str
    confidence: float
    requires_ocr: bool
    requires_review: bool


def inspect_bytes(data: bytes, filename: str, mime_type: str) -> Inspection:
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError("document payload must be bytes")
    if not filename or "/" in filename or "\\" in filename or ".." in filename:
        raise ValueError("unsafe filename")
    digest = hashlib.sha256(bytes(data)).hexdigest()
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return Inspection(
        filename=filename,
        mime_type=mime_type,
        byte_size=len(data),
        source_sha256=digest,
        extension=extension,
        is_text=mime_type.startswith("text/"),
        is_image=mime_type.startswith("image/"),
        is_pdf=mime_type == "application/pdf",
    )


def classify_route(inspection: Inspection, *, structured_available: bool = True) -> RouteDecision:
    """Choose the cheapest reliable route without treating a provider as truth."""
    if inspection.is_text:
        return RouteDecision("text", "native text input", 0.98, False, False)
    if inspection.is_image:
        return RouteDecision("ocr", "image requires OCR/layout extraction", 0.90, True, True)
    if inspection.is_pdf:
        if structured_available:
            return RouteDecision("structured-pdf", "structured PDF adapter available", 0.90, False, False)
        return RouteDecision("ocr", "no structured adapter; escalate to OCR", 0.55, True, True)
    if inspection.extension in {"xlsx", "xls", "csv"}:
        return RouteDecision("tabular", "tabular source", 0.94, False, False)
    return RouteDecision("generic", "unknown format requires guarded inspection", 0.40, False, True)


def advance(document: DocumentEnvelope, target: ProcessingState) -> DocumentEnvelope:
    transitions: dict[ProcessingState, set[ProcessingState]] = {
        ProcessingState.RAW: {ProcessingState.EXTRACTED, ProcessingState.FAILED},
        ProcessingState.EXTRACTED: {ProcessingState.STAGING, ProcessingState.QUARANTINED, ProcessingState.FAILED},
        ProcessingState.STAGING: {ProcessingState.VALIDATED, ProcessingState.QUARANTINED, ProcessingState.FAILED},
        ProcessingState.VALIDATED: {ProcessingState.RECONCILED, ProcessingState.QUARANTINED, ProcessingState.FAILED},
        ProcessingState.RECONCILED: {ProcessingState.APPROVED, ProcessingState.REVIEW, ProcessingState.QUARANTINED, ProcessingState.FAILED},
        ProcessingState.REVIEW: {ProcessingState.APPROVED, ProcessingState.QUARANTINED},
        ProcessingState.APPROVED: {ProcessingState.PRODUCTION},
        ProcessingState.QUARANTINED: {ProcessingState.EXTRACTED, ProcessingState.STAGING},
        ProcessingState.FAILED: {ProcessingState.RAW, ProcessingState.EXTRACTED},
        ProcessingState.PRODUCTION: set(),
    }
    if target not in transitions.get(document.state, set()):
        raise ValueError(f"illegal document transition: {document.state} -> {target}")
    document.state = target
    return document


def confidence_gate(score: float, *, critical: bool = False) -> str:
    if not isinstance(score, (int, float)) or not math.isfinite(float(score)):
        return "QUARANTINE"
    score = max(0.0, min(1.0, float(score)))
    if score >= 0.90:
        return "APPROVE"
    if score >= 0.70 and not critical:
        return "REVIEW"
    return "QUARANTINE"


def build_processing_snapshot(data: bytes, filename: str, mime_type: str, *, structured_available: bool = True) -> dict[str, Any]:
    inspection = inspect_bytes(data, filename, mime_type)
    route = classify_route(inspection, structured_available=structured_available)
    return {
        "inspection": asdict(inspection),
        "route": asdict(route),
        "source_sha256": inspection.source_sha256,
        "contract_version": "document-pipeline.v1",
    }


def process_with_parser(data: bytes, filename: str, mime_type: str, parser: Callable[[bytes, str, str], DocumentEnvelope]) -> tuple[DocumentEnvelope, dict[str, Any]]:
    """Run deterministic security/provenance boundaries around an injected parser."""
    snapshot = build_processing_snapshot(data, filename, mime_type)
    document = parser(data, filename, mime_type)
    provider_hash = document.metadata.get("source_sha256")
    if provider_hash and provider_hash != snapshot["source_sha256"]:
        raise ValueError("provider source hash does not match inspected source")
    document.metadata["source_sha256"] = snapshot["source_sha256"]
    document.metadata["pipeline_contract"] = snapshot["contract_version"]
    document.metadata["route"] = snapshot["route"]["route"]
    if document.state == ProcessingState.RAW:
        advance(document, ProcessingState.EXTRACTED)
    return document, snapshot
