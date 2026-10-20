import { describe, expect, it } from 'vitest';
import { validateDataQualitySnapshot } from './data-quality-snapshot-runtime';

const tenant = '11111111-1111-4111-8111-111111111111';
const validEntity = { name: 'العملاء', total: 10, issues: 2, score: 80, icon: 'users' as const };
const validIssue = { entity: 'العملاء', field: 'الاسم', issue: 'اسم فارغ', count: 2, severity: 'critical' as const };

const valid = () => ({ status: 'OK' as const, tenant_id: tenant, entities: [validEntity], issues: [validIssue] });

describe('validateDataQualitySnapshot', () => {
  it('accepts a valid populated snapshot', () => {
    expect(validateDataQualitySnapshot(valid())).toEqual(valid());
  });

  it('preserves a structurally empty snapshot as EMPTY', () => {
    expect(validateDataQualitySnapshot({ status: 'EMPTY', tenant_id: tenant, entities: [], issues: [] })).toMatchObject({ status: 'EMPTY', entities: [], issues: [] });
  });

  it.each([
    ['missing tenant', { status: 'OK', entities: [], issues: [] }],
    ['invalid status', { status: 'UNKNOWN', tenant_id: tenant, entities: [], issues: [] }],
    ['non-array entities', { status: 'OK', tenant_id: tenant, entities: null, issues: [] }],
    ['entity total below zero', { ...valid(), entities: [{ ...validEntity, total: -1 }] }],
    ['entity issues above total', { ...valid(), entities: [{ ...validEntity, issues: 11 }] }],
    ['entity score above 100', { ...valid(), entities: [{ ...validEntity, score: 101 }] }],
    ['issue count below zero', { ...valid(), issues: [{ ...validIssue, count: -1 }] }],
    ['invalid issue severity', { ...valid(), issues: [{ ...validIssue, severity: 'fatal' }] }],
    ['EMPTY with entity payload', { status: 'EMPTY', tenant_id: tenant, entities: [validEntity], issues: [] }],
    ['EMPTY with issue payload', { status: 'EMPTY', tenant_id: tenant, entities: [], issues: [validIssue] }],
  ])('rejects %s', (_name, payload) => {
    expect(() => validateDataQualitySnapshot(payload)).toThrow();
  });
});
