import { describe, expect, it } from 'vitest';
import { buildCanonicalIntelligence } from './canonicalIntelligence';

describe('canonical intelligence input guards', () => {
  const base = { sales: [], purchases: [], inventory: [], salesHistory: [] };
  it('does not inflate receivables from negative payments', () => {
    const result = buildCanonicalIntelligence({ ...base, sales: [{ id: 's1', total: 100, paidAmount: -50 }] });
    expect(result.metrics.find((m) => m.key === 'receivables')?.value).toBe(100);
  });
  it('treats non-finite payments as unpaid rather than propagating NaN', () => {
    const result = buildCanonicalIntelligence({ ...base, sales: [{ id: 's1', total: 100, paidAmount: Number.NaN }] });
    expect(result.metrics.find((m) => m.key === 'receivables')?.value).toBe(100);
  });
  it('excludes negative history from velocity', () => {
    const result = buildCanonicalIntelligence({ ...base, inventory: [{ sku: 'A', stock: 10, unitCost: 2 }], salesHistory: [10, -100, 20] });
    expect(result.metrics.find((m) => m.key === 'inventory_velocity')?.value).toBe(15);
  });
  it('does not produce negative inventory valuation', () => {
    const result = buildCanonicalIntelligence({ ...base, inventory: [{ sku: 'A', stock: -10, unitCost: 2 }] });
    expect(result.metrics.find((m) => m.key === 'inventory_value')?.value).toBe(0);
  });
});
