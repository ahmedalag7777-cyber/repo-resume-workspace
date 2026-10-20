import { describe, expect, it } from 'vitest';
import { getReportArchetype } from './archetype-registry';
import { deriveReportIntelligence } from './report-smart-insights';
import { applyArchetypeRuleSet } from './archetype-evaluator';

describe('persisted intelligence fallback', () => {
  it('turns verified inventory calculations into a source-bound signal without fabricating raw fields', () => {
    const report = {
      specialty: 'inventory',
      rowCount: 342,
      sourceAnalysis: {
        datasets: [{
          columns: [
            { name: 'productCode', mappedField: 'sku' },
            { name: 'currentStock', mappedField: 'current_stock' },
          ],
        }],
      },
      canonicalRows: [
        { row_number: 1, data: { sku: 'A-1', current_stock: 10 } },
        { row_number: 2, data: { sku: 'A-2', current_stock: 0 } },
      ],
      persistedIntelligenceCalculations: [
        {
          metric_id: 'stock-demand-ratio',
          name: 'نسبة الرصيد إلى الطلب المرجعي',
          availability_state: 'CALCULATED',
          value: 0.0712,
          unit: 'ratio',
          sample_size: 342,
          usable_sample: 332,
          confidence: 0.9708,
        },
        {
          metric_id: 'negative-balance-rows',
          name: 'سجلات الرصيد السالب',
          availability_state: 'CALCULATED',
          value: 15,
          unit: 'rows',
          sample_size: 342,
          usable_sample: 332,
          confidence: 0.9708,
        },
        {
          metric_id: 'zero-balance-rows',
          name: 'سجلات الرصيد الصفري',
          availability_state: 'CALCULATED',
          value: 128,
          unit: 'rows',
          sample_size: 342,
          usable_sample: 332,
          confidence: 0.9708,
        },
      ],
    };

    const profile = getReportArchetype('inventory.movement-card');
    if (!profile) throw new Error('missing test archetype');
    const base = deriveReportIntelligence(report);
    const result = applyArchetypeRuleSet(profile, report, base);

    expect(result.signals[0]?.id).toBe('model:inventory.movement-card');
    expect(result.signals[0]?.message).toContain('0.07');
    expect(result.signals[0]?.message).toContain('15');
    expect(result.recommendations[0]?.status).toBe('PROPOSED');
    expect(result.recommendations[0]?.blocker).toContain('مطابقة');
  });
});
