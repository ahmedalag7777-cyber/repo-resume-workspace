from app.intermediate_model import DocumentEnvelope, Provenance, can_transition


def test_unknown_values_are_preserved_and_serializable() -> None:
    envelope = DocumentEnvelope(
        schema_version="document-intelligence.v1",
        filename="sample.csv",
        mime_type="text/csv",
        source_sha256="abc",
        engine="test",
        status="EXTRACTED",
        metadata={"unknown_column_count": 1},
        warnings=[],
    )
    payload = envelope.to_dict()
    assert payload["schema_version"] == "document-intelligence.v1"
    assert payload["metadata"]["unknown_column_count"] == 1


def test_provenance_keeps_source_identity() -> None:
    provenance = Provenance(
        source_file="invoice.pdf",
        source_sha256="abc",
        page=2,
        table=1,
        row=7,
        column=3,
        cell="C8",
    )
    assert provenance.page == 2
    assert provenance.cell == "C8"


def test_lifecycle_is_forward_only_by_default() -> None:
    assert can_transition("RAW", "EXTRACTED")
    assert can_transition("EXTRACTED", "STAGING")
    assert can_transition("RECONCILED", "APPROVED")
    assert not can_transition("APPROVED", "RAW")
