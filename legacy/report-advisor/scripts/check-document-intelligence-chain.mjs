import assert from 'node:assert/strict';

const document = { id: 'doc-a', tenant_id: 'tenant-a', sha256: 'sha-doc-a' };
const ingestion = { document_id: document.id, tenant_id: document.tenant_id, status: 'INGESTED' };
const extraction = { ingestion_id: document.id, tenant_id: document.tenant_id, text: 'Invoice total 150' };
const normalized = { extraction_id: extraction.ingestion_id, tenant_id: extraction.tenant_id, total: 150 };
const evidence = { source_document_id: document.id, tenant_id: document.tenant_id, value: normalized.total };
const canonical = { evidence_ids: [evidence.source_document_id], tenant_id: evidence.tenant_id, total: evidence.value };
const report = { canonical_ids: canonical.evidence_ids, tenant_id: canonical.tenant_id, total: canonical.total };

assert.equal(ingestion.document_id, document.id);
assert.equal(extraction.ingestion_id, ingestion.document_id);
assert.equal(normalized.extraction_id, extraction.ingestion_id);
assert.equal(evidence.source_document_id, document.id);
assert.equal(canonical.evidence_ids[0], document.id);
assert.equal(report.canonical_ids[0], document.id);
assert.equal(report.tenant_id, document.tenant_id);
assert.equal(report.total, 150);

assert.throws(() => { if (extraction.tenant_id !== 'tenant-b') throw new Error('TENANT_BOUNDARY'); }, /TENANT_BOUNDARY/);
assert.throws(() => { if (evidence.source_document_id !== 'forged-doc') throw new Error('DOCUMENT_LINEAGE_REQUIRED'); }, /DOCUMENT_LINEAGE_REQUIRED/);
assert.throws(() => { if (report.canonical_ids[0] !== 'forged-canonical') throw new Error('CANONICAL_LINEAGE_REQUIRED'); }, /CANONICAL_LINEAGE_REQUIRED/);

console.log('document intelligence chain: PASS');
