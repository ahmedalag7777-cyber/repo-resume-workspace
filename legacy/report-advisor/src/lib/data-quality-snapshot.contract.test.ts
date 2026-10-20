import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDataQualitySnapshot } from './data-quality-snapshot-core';

describe('data quality architecture contract', () => {
  const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260830240000_fix_empty_quality_truth.sql'), 'utf8');
  const adapter = readFileSync(resolve(process.cwd(), 'src/lib/data-quality-snapshot-runtime.ts'), 'utf8');
  const page = readFileSync(resolve(process.cwd(), 'src/pages/DataQualitySnapshotPage.tsx'), 'utf8');
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

  it('uses a tenant-authoritative invoker RPC with no tenant parameter', () => {
    expect(migration).toContain('get_data_quality_snapshot()');
    expect(migration).toContain('current_company_id()');
    expect(migration).toContain('SECURITY INVOKER');
    expect(migration).toContain('SET search_path = public');
    expect(migration).not.toContain('SECURITY DEFINER');
    expect(migration).not.toMatch(/get_data_quality_snapshot\([^)]*(company|tenant|organization)[^)]*\)/i);
  });

  it('keeps the browser adapter on the canonical RPC and delegates validation to the pure core', () => {
    expect(adapter).toContain("supabase.rpc('get_data_quality_snapshot')");
    expect(adapter).toContain('validateDataQualitySnapshot');
    expect(adapter).toContain("./data-quality-snapshot-core");
    expect(adapter).not.toContain("from('customers')");
    expect(adapter).not.toContain("from('products')");
    expect(adapter).not.toContain("from('sales_invoices')");
    expect(adapter).not.toContain("from('inventory_balances')");
  });

  it('consumes the validated adapter and never turns zero records into a false 100%', () => {
    expect(page).toContain("@/lib/data-quality-snapshot");
    expect(page).toContain("totalRecords === 0 ? 0");
    expect(page).toContain('Math.max(0, Math.min(100');
    expect(page).toContain("totalRecords===0?'لا توجد بيانات تجارية بعد؛ النتيجة EMPTY وليست نجاح جودة بيانات.'");
  });

  it('behaviorally accepts a valid EMPTY snapshot', () => {
    expect(validateDataQualitySnapshot({ status: 'EMPTY', tenant_id: 'tenant-1', entities: [], issues: [] })).toMatchObject({ status: 'EMPTY', entities: [], issues: [] });
  });

  it('behaviorally rejects fabricated detail inside an EMPTY snapshot', () => {
    expect(() => validateDataQualitySnapshot({ status: 'EMPTY', tenant_id: 'tenant-1', entities: [{ name: 'العملاء', total: 1, issues: 1, score: 0, icon: 'users' }], issues: [] })).toThrow('DATA_QUALITY_EMPTY_SNAPSHOT_INCONSISTENT');
  });

  it('behaviorally preserves aggregate issue counts when multiple findings exceed row count', () => {
    const snapshot = validateDataQualitySnapshot({ status: 'OK', tenant_id: 'tenant-1', entities: [{ name: 'المنتجات', total: 2, issues: 4, score: 0, icon: 'package' }], issues: [
      { entity: 'المنتجات', field: 'SKU', issue: 'SKU فارغ', count: 2, severity: 'critical' },
      { entity: 'المنتجات', field: 'الاسم', issue: 'اسم فارغ', count: 2, severity: 'critical' },
    ] });
    expect(snapshot.entities[0].issues).toBe(4);
  });

  it('behaviorally rejects negative findings', () => {
    expect(() => validateDataQualitySnapshot({ status: 'OK', tenant_id: 'tenant-1', entities: [{ name: 'المنتجات', total: 2, issues: -1, score: 100, icon: 'package' }], issues: [] })).toThrow('DATA_QUALITY_ENTITY_INVALID');
  });

  it('routes the data-quality surface to the canonical page', () => {
    expect(app).toContain("@/pages/DataQualitySnapshotPage");
    expect(app).not.toContain("@/pages/EntityPages').then(m => ({ default: m.DataQualityPage }))");
  });
});
