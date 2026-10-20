import { describe, expect, it } from 'vitest';
import { aggregateFamilyDemand, familyReorderNeed } from './family-demand-bridge';

describe('family-demand-bridge', () => {
  it('aggregates only approved family members in base units', () => {
    const result = aggregateFamilyDemand(
      [
        { familyId: 'f1', sku: 'A', approved: true, conversionToBase: 1 },
        { familyId: 'f1', sku: 'B', approved: true, conversionToBase: 2 },
        { familyId: 'f1', sku: 'C', approved: false, conversionToBase: 1 },
      ],
      [
        { familyId: 'f1', sku: 'A', requestedUnits: 100, fulfilledUnits: 80, stockUnits: 20, avgDailyDemand: 5, forecastDailyDemand: 6, unitPrice: 10, customersAffected: 2 },
        { familyId: 'f1', sku: 'B', requestedUnits: 20, fulfilledUnits: 20, stockUnits: 10, avgDailyDemand: 2, forecastDailyDemand: 3, unitPrice: 20, customersAffected: 1 },
        { familyId: 'f1', sku: 'C', requestedUnits: 1000, fulfilledUnits: 0, stockUnits: 1000, avgDailyDemand: 99, forecastDailyDemand: 99, unitPrice: 1, customersAffected: 10 },
      ]
    );
    expect(result).toHaveLength(1);
    expect(result[0].memberSkus).toEqual(['A', 'B']);
    expect(result[0].requestedUnits).toBe(140);
    expect(result[0].fulfilledUnits).toBe(120);
    expect(result[0].stockUnits).toBe(40);
    expect(result[0].lostUnits).toBe(20);
    expect(result[0].fillRate).toBeCloseTo(120 / 140);
  });

  it('does not let family membership imply substitution', () => {
    const result = aggregateFamilyDemand(
      [{ familyId: 'f1', sku: 'A', approved: false, conversionToBase: 1 }],
      [{ familyId: 'f1', sku: 'A', requestedUnits: 10, fulfilledUnits: 0, stockUnits: 10, avgDailyDemand: 1, forecastDailyDemand: 1 }]
    );
    expect(result).toEqual([]);
  });

  it('calculates normalized family reorder need from forecast coverage', () => {
    const aggregate = aggregateFamilyDemand(
      [{ familyId: 'f1', sku: 'A', approved: true, conversionToBase: 1 }],
      [{ familyId: 'f1', sku: 'A', requestedUnits: 100, fulfilledUnits: 100, stockUnits: 20, avgDailyDemand: 4, forecastDailyDemand: 5 }]
    )[0];
    expect(familyReorderNeed(aggregate, 7, 3)).toBe(30);
  });
});
