import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.contracts import DocumentEnvelope, ProcessingState
from app.pipeline import advance, build_processing_snapshot, confidence_gate, process_with_parser


def test_route_and_source_fingerprint_are_deterministic() -> None:
    snapshot = build_processing_snapshot(b"sku,qty\n1,2\n", "report.csv", "text/csv")
    assert snapshot["route"]["route"] == "text"
    assert len(snapshot["source_sha256"]) == 64
    assert snapshot["contract_version"] == "document-pipeline.v1"


def test_unsafe_filename_is_rejected() -> None:
    for name in ("../x.csv", "folder/x.csv", r"folder\x.csv"):
        try:
            build_processing_snapshot(b"x", name, "text/plain")
        except ValueError:
            pass
        else:
            raise AssertionError(name)


def test_confidence_gate_is_fail_closed() -> None:
    assert confidence_gate(0.95) == "APPROVE"
    assert confidence_gate(0.80) == "REVIEW"
    assert confidence_gate(0.80, critical=True) == "QUARANTINE"
    assert confidence_gate(float("nan")) == "QUARANTINE"
    assert confidence_gate(float("inf")) == "QUARANTINE"
    assert confidence_gate(float("-inf")) == "QUARANTINE"


def test_lifecycle_rejects_illegal_transition() -> None:
    doc = DocumentEnvelope(mime_type="text/csv")
    try:
        advance(doc, ProcessingState.APPROVED)
    except ValueError:
        pass
    else:
        raise AssertionError("RAW -> APPROVED must be rejected")


def test_parser_boundary_preserves_source_hash_and_moves_raw_to_extracted() -> None:
    def parser(data: bytes, filename: str, mime: str) -> DocumentEnvelope:
        return DocumentEnvelope(mime_type=mime, metadata={"parser": "test"})

    document, snapshot = process_with_parser(b"abc", "a.txt", "text/plain", parser)
    assert document.state == ProcessingState.EXTRACTED
    assert document.metadata["source_sha256"] == snapshot["source_sha256"]
    assert document.metadata["route"] == "text"


def test_parser_hash_mismatch_is_blocked() -> None:
    def parser(data: bytes, filename: str, mime: str) -> DocumentEnvelope:
        return DocumentEnvelope(mime_type=mime, metadata={"source_sha256": "0" * 64})

    try:
        process_with_parser(b"abc", "a.txt", "text/plain", parser)
    except ValueError as exc:
        assert "source hash" in str(exc)
    else:
        raise AssertionError("provider hash mismatch must fail closed")
