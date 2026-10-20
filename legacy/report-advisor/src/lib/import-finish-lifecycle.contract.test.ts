import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260830210000_harden_import_finish_lifecycle.sql'),
  'utf8',
);

const assertLifecycleContract = (source: string) => {
  for (const token of [
    'SECURITY INVOKER',
    'SET search_path = public',
    'public.current_company_id()',
    "p_status NOT IN ('completed','partial','failed','cancelled')",
    "IMPORT_TERMINAL_STATUS_REQUIRED",
    "IMPORT_JOB_ALREADY_TERMINAL",
    "IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN",
    "v_current_status IN ('completed','partial','failed','cancelled')",
    "status IN ('queued','processing')",
    'REVOKE ALL ON FUNCTION public.import_finish_job(uuid,text,jsonb,text) FROM PUBLIC, anon',
    'GRANT EXECUTE ON FUNCTION public.import_finish_job(uuid,text,jsonb,text) TO authenticated',
  ]) {
    expect(source).toContain(token);
  }
};

describe('import finish lifecycle security contract', () => {
  it('requires tenant authority and a closed terminal transition set', () => {
    assertLifecycleContract(migration);
  });

  it('rejects a weakened implementation that permits arbitrary terminal status', () => {
    const weakened = migration.replace(
      "IF p_status NOT IN ('completed','partial','failed','cancelled') THEN\n    RAISE EXCEPTION 'IMPORT_TERMINAL_STATUS_REQUIRED';\n  END IF;",
      '',
    );
    expect(() => assertLifecycleContract(weakened)).toThrow();
  });

  it('rejects a weakened implementation that removes terminal-state protection', () => {
    const weakened = migration.replace("RAISE EXCEPTION 'IMPORT_JOB_ALREADY_TERMINAL';", 'NULL;');
    expect(() => assertLifecycleContract(weakened)).toThrow();
  });

  it('rejects a weakened implementation that removes caller tenant authority', () => {
    const weakened = migration.replace('public.current_company_id()', 'NULL');
    expect(() => assertLifecycleContract(weakened)).toThrow();
  });
});
