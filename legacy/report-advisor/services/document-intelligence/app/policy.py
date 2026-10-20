from __future__ import annotations

from .contracts import DocumentEnvelope, ProcessingState


class RawDataBoundaryError(RuntimeError):
    """Raised when a downstream consumer attempts to use unvalidated data."""


def require_validated(document: DocumentEnvelope) -> DocumentEnvelope:
    """Allow downstream intelligence only after validation and reconciliation.

    Approval is intentionally separate: services may inspect validated data for
    review, but production-facing consumers must require APPROVED explicitly.
    """
    allowed = {
        ProcessingState.VALIDATED,
        ProcessingState.RECONCILED,
        ProcessingState.APPROVED,
        ProcessingState.PRODUCTION,
    }
    if document.state not in allowed:
        raise RawDataBoundaryError(
            f"Downstream access denied for processing state: {document.state}"
        )
    return document


def require_approved(document: DocumentEnvelope) -> DocumentEnvelope:
    """Allow production/reporting consumers to read only approved data."""
    if document.state not in {ProcessingState.APPROVED, ProcessingState.PRODUCTION}:
        raise RawDataBoundaryError(
            f"Production access requires approved canonical data; got: {document.state}"
        )
    return document
