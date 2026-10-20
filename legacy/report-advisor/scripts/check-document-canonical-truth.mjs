import assert from 'node:assert/strict';

function reconcile(rows) {
  const bySku = new Map();
  for (const row of rows) {
    assert(row.tenant_id && row.sku, 'IDENTITY_REQUIRED');
    const key = `${row.tenant_id}:${row.sku}`;
    const prior = bySku.get(key);
    if (!prior) { bySku.set(key, row); continue; }
    assert.equal(prior.source_priority, row.source_priority, 'CONFLICT_REQUIRES_EXPLICIT_RESOLUTION');
    assert.equal(prior.value, row.value, 'CANONICAL_CONFLICT');
  }
  return [...bySku.values()];
}

const canonical = reconcile([
  { tenant_id:'tenant-a', sku:'A-1', value:'100', source_priority:1 },
  { tenant_id:'tenant-a', sku:'A-1', value:'100', source_priority:1 },
]);
assert.equal(canonical.length, 1);
assert.throws(() => reconcile([
  { tenant_id:'tenant-a', sku:'A-1', value:'100', source_priority:1 },
  { tenant_id:'tenant-a', sku:'A-1', value:'90', source_priority:1 },
]), /CANONICAL_CONFLICT/);
assert.throws(() => reconcile([
  { tenant_id:'tenant-a', sku:'A-1', value:'100', source_priority:1 },
  { tenant_id:'tenant-a', sku:'A-1', value:'100', source_priority:2 },
]), /CONFLICT_REQUIRES_EXPLICIT_RESOLUTION/);
assert.throws(() => reconcile([{ tenant_id:'tenant-a', value:'100', source_priority:1 }]), /IDENTITY_REQUIRED/);

console.log('document canonical truth reconciliation: PASS');
