import assert from 'node:assert/strict';

const STAGES = ['IMPORTED','VALIDATED','NORMALIZED','EVIDENCED','CANONICAL'];

function advance(record, next, payload = {}) {
  assert.equal(STAGES.indexOf(next), STAGES.indexOf(record.stage) + 1, `INVALID_STAGE:${record.stage}->${next}`);
  assert.ok(record.tenant_id && record.sku, 'IDENTITY_REQUIRED');
  if (next === 'VALIDATED') assert.equal(payload.valid, true, 'VALIDATION_REQUIRED');
  if (next === 'NORMALIZED') assert.ok(payload.normalized_value, 'NORMALIZATION_REQUIRED');
  if (next === 'EVIDENCED') assert.ok(payload.source_ref && payload.content_hash, 'EVIDENCE_PROVENANCE_REQUIRED');
  if (next === 'CANONICAL') assert.ok(payload.lineage_id, 'LINEAGE_REQUIRED');
  return { ...record, ...payload, stage: next };
}

let r = { id:'import-001', tenant_id:'tenant-a', sku:'A-1', stage:'IMPORTED' };
r = advance(r, 'VALIDATED', { valid:true });
r = advance(r, 'NORMALIZED', { normalized_value:'100' });
r = advance(r, 'EVIDENCED', { source_ref:'file.xlsx!Sheet1!A2', content_hash:'sha256:row' });
r = advance(r, 'CANONICAL', { lineage_id:'lineage-001' });
assert.equal(r.stage, 'CANONICAL');

assert.throws(() => advance({ ...r, stage:'IMPORTED' }, 'NORMALIZED', { normalized_value:'100' }), /INVALID_STAGE/);
assert.throws(() => advance({ ...r, stage:'IMPORTED' }, 'VALIDATED', { valid:false }), /VALIDATION_REQUIRED/);
assert.throws(() => advance({ ...r, stage:'NORMALIZED' }, 'EVIDENCED', { source_ref:'x' }), /EVIDENCE_PROVENANCE_REQUIRED/);
assert.throws(() => advance({ ...r, stage:'EVIDENCED' }, 'CANONICAL', {}), /LINEAGE_REQUIRED/);
assert.throws(() => advance({ id:'x', stage:'IMPORTED' }, 'VALIDATED', { valid:true }), /IDENTITY_REQUIRED/);

console.log('import evidence contract: PASS');
