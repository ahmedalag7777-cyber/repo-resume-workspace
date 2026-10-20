import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const adapter = fs.readFileSync(path.join(root, 'src/lib/dashboard-canonical.ts'), 'utf8');

describe('dashboard snapshot RPC contract', () => {
  it('uses the canonical snapshot for top entities instead of an unbound secondary RPC', () => {
    expect(adapter).toContain("supabase.rpc('get_dashboard_snapshot'");
    expect(adapter).toContain("topCustomers: requiredArray<TopEntity>(row.topCustomers)");
    expect(adapter).toContain("topProducts: requiredArray<TopEntity>(row.topProducts)");
    expect(adapter).not.toContain("supabase.rpc('get_dashboard_top_entities'");
  });
});
