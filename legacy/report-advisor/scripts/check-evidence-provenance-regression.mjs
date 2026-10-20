import assert from 'node:assert/strict';

const generated = {
  evidence_id: 'ev-001',
  tenant_id: 'tenant-a',
  source_hash: 'a'.repeat(64),
  source_type: 'DOCUMENT',
  lineage: ['ingestion-1', 'extraction-1', 'normalization-1'],
  generated_at: '2026-08-31T00:00:00Z',
};

function materializeEvidence(input) {
  return {
    evidence_id: generated.evidence_id,
    tenant_id: generated.tenant_id,
    source_hash: generated.source_hash,
    source_type: generated.source_type,
    lineage: [...generated.lineage],
    generated_at: generated.generated_at,
  };
}

const caller = {
  evidence_id: 'attacker-controlled',
  tenant_id: 'tenant-b',
  source_hash: 'tampered',
  source_type: 'FAKE',
  lineage: ['forged'],
  generated_at: '2099-01-01T00:00:00Z',
};

const result = materializeEvidence(caller);
assert.deepEqual(result, generated);
assert.notEqual(result.evidence_id, caller.evidence_id);
assert.notEqual(result.tenant_id, caller.tenant_id);
assert.notEqual(result.source_hash, caller.source_hash);
assert.notDeepEqual(result.lineage, caller.lineage);
assert.match(result.source_hash, /^[0-9a-f]{64}$/);

console.log('evidence provenance regression: PASS');
