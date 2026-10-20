import assert from 'node:assert/strict';
import { committedCanonicalRecordIds, isGovernedRealFileRecord, resolveCanonicalImportIdFromAnchor } from './real-source-provenance.mjs';

const upload = {
  id: 'tenant-upload',
  file_name: 'invoice.pdf',
  storage_path: 'uploads/company-a/invoice.pdf',
  file_hash: 'sha256:' + 'a'.repeat(64),
  metadata: { report_corpus: 'true', source_path: 'uploads/company-a/invoice.pdf' },
};
assert.equal(isGovernedRealFileRecord(upload, 'uploads/company-a/invoice.pdf'), true);
assert.equal(isGovernedRealFileRecord({
  ...upload,
  metadata: { report_corpus: true, source_path: 'tests/fixtures/realistic-reports/invoice.pdf' },
}, 'tests/fixtures/realistic-reports/invoice.pdf'), false);
assert.equal(isGovernedRealFileRecord({
  ...upload,
  metadata: { report_corpus: true, source_path: 'tests\\\\fixtures\\\\realistic-reports\\\\invoice.pdf' },
}, 'tests\\\\fixtures\\\\realistic-reports\\\\invoice.pdf'), false);
assert.equal(isGovernedRealFileRecord({
  ...upload, metadata: { report_corpus: true, fixture_type: 'synthetic-realistic' },
}), false);
assert.equal(isGovernedRealFileRecord({
  ...upload, metadata: { report_corpus: true, catalog_id: 'report-intelligence.48' },
}), false);
assert.equal(isGovernedRealFileRecord({
  ...upload, metadata: { report_corpus: false, source_path: 'uploads/company-a/invoice.pdf' },
}), false);
assert.deepEqual(committedCanonicalRecordIds({ committed_count: 610, committed_ids: ['', 'row-a', 'row-b', 'row-a', null] }), ['row-a', 'row-b']);
assert.deepEqual(committedCanonicalRecordIds({ committed_count: 0, committed_ids: ['row-a'] }), []);
assert.deepEqual(committedCanonicalRecordIds({ committed_count: 3, committed_ids: null }), []);

const anchor = {
  id: 'row-anchor-a',
  company_id: 'company-a',
  source_hash: 'sha256:' + 'b'.repeat(64),
  import_job_id: 'import-job-a',
};
const expectedAnchor = { recordId: 'row-anchor-a', companyId: 'company-a', sourceHash: 'sha256:' + 'b'.repeat(64) };
assert.equal(resolveCanonicalImportIdFromAnchor(anchor, expectedAnchor), 'import-job-a');
assert.equal(resolveCanonicalImportIdFromAnchor({ ...anchor, company_id: 'company-b' }, expectedAnchor), null);
assert.equal(resolveCanonicalImportIdFromAnchor({ ...anchor, source_hash: 'sha256:' + 'c'.repeat(64) }, expectedAnchor), null);
assert.equal(resolveCanonicalImportIdFromAnchor({ ...anchor, id: 'other-row' }, expectedAnchor), null);
assert.equal(resolveCanonicalImportIdFromAnchor({ ...anchor, import_job_id: null }, expectedAnchor), null);

console.log('REAL_SOURCE_PROVENANCE_AND_CANONICAL_ANCHOR_CONTRACT_PASS');
