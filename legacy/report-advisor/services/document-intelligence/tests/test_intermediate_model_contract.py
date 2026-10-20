import unittest

from app.intermediate_model import (
    Block,
    Cell,
    DocumentEnvelope,
    Page,
    Provenance,
    Row,
    Table,
    can_transition,
)


class IntermediateModelContractTests(unittest.TestCase):
    def test_cell_provenance_supports_page_table_row_column_and_bbox(self):
        provenance = Provenance(
            source_file="report.pdf",
            source_sha256="a" * 64,
            page=2,
            table=1,
            row=7,
            column=3,
            cell="C8",
            bbox=(1.0, 2.0, 3.0, 4.0),
            parser="test-parser",
            parser_version="1.0",
        )
        cell = Cell(value="123", source_text="١٢٣", confidence=0.99, provenance=provenance)
        self.assertEqual(cell.provenance.cell, "C8")
        self.assertEqual(cell.provenance.page, 2)
        self.assertEqual(cell.provenance.bbox, (1.0, 2.0, 3.0, 4.0))

    def test_intermediate_model_can_represent_mixed_page_and_table_content(self):
        provenance = Provenance(source_file="x.pdf", source_sha256="b" * 64, page=1)
        table = Table(
            index=0,
            headers=["SKU", "Price"],
            rows=[Row(cells=[Cell(value="A1", provenance=provenance), Cell(value=10, provenance=provenance)])],
            provenance=provenance,
        )
        page = Page(number=1, blocks=[Block(type="text", text="Header", provenance=provenance)], tables=[table])
        envelope = DocumentEnvelope(
            schema_version="1.0",
            filename="x.pdf",
            mime_type="application/pdf",
            source_sha256="b" * 64,
            engine="test",
            status="EXTRACTED",
            pages=[page],
            tables=[table],
        )
        payload = envelope.to_dict()
        self.assertEqual(payload["pages"][0]["tables"][0]["headers"], ["SKU", "Price"])
        self.assertEqual(payload["pages"][0]["tables"][0]["rows"][0]["cells"][0]["provenance"]["source_sha256"], "b" * 64)

    def test_production_is_terminal(self):
        self.assertFalse(can_transition("PRODUCTION", "RAW"))
        self.assertFalse(can_transition("PRODUCTION", "APPROVED"))


if __name__ == "__main__":
    unittest.main()
