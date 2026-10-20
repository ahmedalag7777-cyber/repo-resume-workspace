import { describe, expect, it } from 'vitest';
import { analyzeFamilyDemandTrend } from './family-demand-trend';

describe('family-demand-trend', () => {
  it('detects acceleration and preserves stockout evidence', () => {
    const result = analyzeFamilyDemandTrend([
      { period: '2026-06', requestedUnits: 100, fulfilledUnits: 100, stockUnits: 50, lostUnits: 0 },
      { period: '2026-07', requestedUnits: 200, fulfilledUnits: 180, stockUnits: 10, lostUnits: 20 },
      { period: '2026-08', requestedUnits: 350, fulfilledUnits: 0, stockUnits: 0, lostUnits: 350 },
    ]);
    expect(result.direction).toBe('accelerating');
    expect(result.accelerationPct).toBeCloseTo(75);
    expect(result.stockoutPeriods).toBe(1);
    expect(result.totalLost).toBe(370);
    expect(result.peakRequested).toBe(350);
  });

  it('does not manufacture a trend from one period', () => {
    const result = analyzeFamilyDemandTrend([{ period: '2026-08', requestedUnits: 100, fulfilledUnits: 100, stockUnits: 20, lostUnits: 0 }]);
    expect(result.direction).toBe('insufficient_data');
    expect(result.confidence).toBeLessThan(0.7);
  });
});
