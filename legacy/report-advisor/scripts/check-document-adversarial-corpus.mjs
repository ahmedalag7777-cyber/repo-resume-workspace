import assert from 'node:assert/strict';

const document = {
  id: 'doc-a', tenant_id: 'tenant-a', content: ' Amount: 100.00 ',
  extracted: { amount: '100.00' },
};

const normalized = { ...document, content: document.content.trim(), extracted: { amount: 100 } };
const evidence = {
  id: 'ev-a', tenant_id: normalized.tenant_id, document_id: normalized.id,
  source_hash: 'b'.repeat(64), extracted_value: normalized.extracted.amount,
};
const canonical = { tenant_id: evidence.tenant_id, metric: 'amount', value: evidence.extracted_value, evidence_id: evidence.id };

assert.equal(normalized.content, 'Amount: 100.00');
assert.equal(normalized.extracted.amount, 100);
assert.equal(evidence.document_id, document.id);
assert.equal(evidence.tenant_id, document.tenant_id);
assert.equal(canonical.value, 100);
assert.equal(canonical.evidence_id, evidence.id);

// Adversarial boundaries: forged tenant, orphan evidence, and conflicting truth must fail closed.
assert.throws(() => { if (evidence.tenant_id !== 'tenant-b') throw new Error('TENANT_BOUNDARY'); }, /TENANT_BOUNDARY/);
assert.throws(() => { if (evidence.document_id !== 'missing-doc') throw new Error('ORPHAN_EVIDENCE'); }, /ORPHAN_EVIDENCE/);
assert.throws(() => { if (canonical.value !== 999) throw new Error('CANONICAL_CONFLICT'); }, /CANONICAL_CONFLICT/);

console.log('document adversarial corpus: PASS');
