import { describe, expect, it } from 'vitest';
import { buildFamilyCoverage, validateFamilyCegSeparation } from './product-family-ceg-bridge';

describe('product family / CEG bridge', () => {
  it('keeps family membership descriptive and exposes ungrouped SKUs', () => {
    const result = buildFamilyCoverage(
      [
        { familyId: 'flour-25', skuId: 'A', approved: true },
        { familyId: 'flour-25', skuId: 'B', approved: true },
      ],
      [{ groupId: 'g1', tenantId: 't1', name: 'approved substitutes', active: true }],
      [{ groupId: 'g1', sku: 'A', conversionToBase: 1, active: true }],
    );
    expect(result[0].skuIds).toEqual(['A', 'B']);
    expect(result[0].cegIds).toEqual(['g1']);
    expect(result[0].ungroupedSkuIds).toEqual(['B']);
  });

  it('rejects a SKU placed in incompatible active CEG scopes', () => {
    expect(() => validateFamilyCegSeparation(
      [{ familyId: 'f1', skuId: 'A', approved: true }],
      [
        { groupId: 'g1', tenantId: 't1', name: 'g1', active: true },
        { groupId: 'g2', tenantId: 't1', name: 'g2', active: true },
      ],
      [
        { groupId: 'g1', sku: 'A', conversionToBase: 1, active: true },
        { groupId: 'g2', sku: 'A', conversionToBase: 1, active: true },
      ],
    )).toThrow('SKU_IN_MULTIPLE_ACTIVE_CEG_SCOPES');
  });
});
