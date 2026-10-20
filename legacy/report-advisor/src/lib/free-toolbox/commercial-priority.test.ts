import { describe, expect, it } from 'vitest';
import { rankCommercialPriority } from './commercial-priority';

describe('commercial-priority', () => {
  it('ranks a fast-moving undercovered item above a healthy item', () => {
    const result = rankCommercialPriority([
      { id: 'risk', stockCoverageDays: 2, forecastDailyDemand: 50, recentAccelerationPct: 40, lostUnits: 100, affectedCustomers: 8, revenueShare: 0.15, profitShare: 0.12, supplierLeadTimeDays: 7, dataConfidence: 0.9 },
      { id: 'healthy', stockCoverageDays: 60, forecastDailyDemand: 5, recentAccelerationPct: 0, lostUnits: 0, affectedCustomers: 0, revenueShare: 0.01, profitShare: 0.01, supplierLeadTimeDays: 5, dataConfidence: 0.9 },
    ]);
    expect(result[0].id).toBe('risk');
    expect(result[0].score).toBeGreaterThan(result[1].score);
    expect(result[0].reasons.length).toBeGreaterThan(0);
  });

  it('never fabricates risk when evidence is absent', () => {
    const result = rankCommercialPriority([{ id: 'unknown', dataConfidence: 0 }]);
    expect(result[0].score).toBe(0);
    expect(result[0].priority).toBe('monitor');
    expect(result[0].reasons).toContain('low evidence confidence');
  });
});
