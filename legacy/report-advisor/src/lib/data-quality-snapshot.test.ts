import { describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('./supabase', () => ({ supabase: { rpc } }));

describe('data quality canonical adapter', () => {
  it('returns only a validated authoritative snapshot', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'OK', tenant_id: 'tenant-a', entities: [{ name: 'العملاء', total: 2, issues: 1, score: 50, icon: 'users' }], issues: [{ entity: 'العملاء', field: 'الاسم', issue: 'اسم فارغ', count: 1, severity: 'critical' }] }, error: null });
    const { fetchDataQualitySnapshot } = await import('./data-quality-snapshot');
    const result = await fetchDataQualitySnapshot();
    expect(rpc).toHaveBeenCalledWith('get_data_quality_snapshot');
    expect(result.entities[0].issues).toBe(1);
    expect(result.issues[0].count).toBe(1);
  });

  it('fails closed on an invalid snapshot', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'OK', entities: [], issues: [] }, error: null });
    const { fetchDataQualitySnapshot } = await import('./data-quality-snapshot');
    await expect(fetchDataQualitySnapshot()).rejects.toThrow('DATA_QUALITY_SNAPSHOT_INVALID');
  });
});
