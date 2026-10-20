import assert from 'node:assert/strict';

const sale = { id: 'sale-1', tenant_id: 'tenant-a', total: 150 };
const items = [
  { sale_id: sale.id, tenant_id: sale.tenant_id, qty: 2, unit_cost: 50 },
  { sale_id: sale.id, tenant_id: sale.tenant_id, qty: 1, unit_cost: 50 },
];

function canonicalCost(saleRow, saleItems) {
  assert(saleItems.length > 0, 'MISSING_SALE_ITEMS');
  for (const item of saleItems) assert.equal(item.tenant_id, saleRow.tenant_id, 'TENANT_BOUNDARY');
  return saleItems.reduce((sum, item) => sum + item.qty * item.unit_cost, 0);
}

assert.equal(canonicalCost(sale, items), 150);
assert.throws(() => canonicalCost(sale, []), /MISSING_SALE_ITEMS/);
assert.throws(() => canonicalCost(sale, [{ ...items[0], tenant_id: 'tenant-b' }]), /TENANT_BOUNDARY/);

// Reconciliation must not silently convert missing cost evidence into zero.
assert.notEqual(0, canonicalCost(sale, items));

console.log('import reconciliation canonical truth: PASS');
