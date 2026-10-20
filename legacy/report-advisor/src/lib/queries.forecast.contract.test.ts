import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const queries = fs.readFileSync(path.join(root, 'src/lib/queries.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260826073000_forecast_canonical_snapshot.sql'), 'utf8');

describe('forecast canonical contract', () => {
  it('uses the bounded tenant-authoritative RPC', () => {
    expect(queries).toContain("supabase.rpc('get_forecast_snapshot'");
    expect(queries).not.toMatch(/supabase\.from\(['"]forecasts['"]\)/);
  });

  it('fails closed without tenant context and restricts the RPC', () => {
    expect(migration).toContain('public.current_company_id()');
    expect(migration).toContain('security invoker');
    expect(migration).toContain('set search_path = public');
    expect(migration).toContain('limit v_limit');
    expect(migration).toContain('revoke all on function public.get_forecast_snapshot(integer) from public');
    expect(migration).toContain('revoke all on function public.get_forecast_snapshot(integer) from anon');
    expect(migration).toContain('grant execute on function public.get_forecast_snapshot(integer) to authenticated');
    expect(migration).toContain('where company_id = v_company_id');
  });
});
