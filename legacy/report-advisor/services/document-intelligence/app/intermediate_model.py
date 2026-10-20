from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class Provenance:
    source_file: str
    source_sha256: str | None = None
    page: int | None = None
    sheet: str | None = None
    table: int | None = None
    row: int | None = None
    column: int | None = None
    cell: str | None = None
    bbox: tuple[float, float, float, float] | None = None
    parser: str | None = None
    parser_version: str | None = None


@dataclass
class Cell:
    value: Any = None
    source_text: str | None = None
    normalized_value: Any = None
    confidence: float | None = None
    status: str = "UNKNOWN"
    provenance: Provenance | None = None


@dataclass
class Row:
    cells: list[Cell] = field(default_factory=list)
    provenance: Provenance | None = None


@dataclass
class Table:
    index: int
    headers: list[str] = field(default_factory=list)
    rows: list[Row] = field(default_factory=list)
    provenance: Provenance | None = None


@dataclass
class Block:
    type: str
    text: str | None = None
    confidence: float | None = None
    provenance: Provenance | None = None


@dataclass
class Page:
    number: int
    blocks: list[Block] = field(default_factory=list)
    tables: list[Table] = field(default_factory=list)


@dataclass
class DocumentEnvelope:
    schema_version: str
    filename: str
    mime_type: str
    source_sha256: str
    engine: str
    status: str
    pages: list[Page] = field(default_factory=list)
    tables: list[Table] = field(default_factory=list)
    images: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "RAW": {"EXTRACTED", "FAILED"},
    "EXTRACTED": {"STAGING", "FAILED", "QUARANTINED"},
    "STAGING": {"VALIDATED", "QUARANTINED", "FAILED"},
    "VALIDATED": {"RECONCILED", "QUARANTINED", "FAILED"},
    "RECONCILED": {"APPROVED", "REVIEW", "QUARANTINED", "FAILED"},
    "REVIEW": {"APPROVED", "QUARANTINED"},
    "APPROVED": {"PRODUCTION"},
    "QUARANTINED": {"EXTRACTED", "STAGING"},
    "PRODUCTION": set(),
    "FAILED": {"RAW", "EXTRACTED"},
}


def can_transition(current: str, target: str) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, set())
