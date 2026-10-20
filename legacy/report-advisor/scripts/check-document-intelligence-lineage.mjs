import assert from 'node:assert/strict';

const stages = ['INGESTED','EXTRACTED','NORMALIZED','EVIDENCE','LINEAGE','CANONICAL','REPORTED'];

function advance(doc, next, payload = {}) {
  const current = stages.indexOf(doc.stage);
  const target = stages.indexOf(next);
  assert.equal(target, current + 1, `INVALID_STAGE:${doc.stage}->${next}`);
  if (next === 'EXTRACTED') assert.ok(payload.content_hash, 'CONTENT_HASH_REQUIRED');
  if (next === 'NORMALIZED') assert.ok(payload.text, 'NORMALIZED_TEXT_REQUIRED');
  if (next === 'EVIDENCE') assert.ok(payload.source_ref, 'SOURCE_REF_REQUIRED');
  if (next === 'LINEAGE') assert.ok(payload.evidence_id, 'EVIDENCE_ID_REQUIRED');
  if (next === 'CANONICAL') assert.ok(payload.lineage_id, 'LINEAGE_ID_REQUIRED');
  if (next === 'REPORTED') assert.ok(payload.canonical_id, 'CANONICAL_ID_REQUIRED');
  return { ...doc, stage: next, ...payload };
}

let d = { id:'doc-synthetic-001', tenant_id:'tenant-a', stage:'INGESTED' };
d = advance(d,'EXTRACTED',{content_hash:'sha256:doc'});
d = advance(d,'NORMALIZED',{text:'normalized arabic text'});
d = advance(d,'EVIDENCE',{source_ref:'page:1'});
d = advance(d,'LINEAGE',{evidence_id:'evidence-1'});
d = advance(d,'CANONICAL',{lineage_id:'lineage-1'});
d = advance(d,'REPORTED',{canonical_id:'canonical-1'});
assert.equal(d.stage,'REPORTED');

assert.throws(() => advance({stage:'INGESTED'},'NORMALIZED',{text:'x'}), /INVALID_STAGE/);
assert.throws(() => advance({stage:'EXTRACTED'},'NORMALIZED',{}), /NORMALIZED_TEXT_REQUIRED/);
assert.throws(() => advance({stage:'NORMALIZED'},'EVIDENCE',{}), /SOURCE_REF_REQUIRED/);
assert.throws(() => advance({stage:'EVIDENCE'},'LINEAGE',{}), /EVIDENCE_ID_REQUIRED/);
assert.throws(() => advance({stage:'LINEAGE'},'CANONICAL',{}), /LINEAGE_ID_REQUIRED/);
assert.throws(() => advance({stage:'CANONICAL'},'REPORTED',{}), /CANONICAL_ID_REQUIRED/);

console.log('document intelligence lineage contract: PASS');
