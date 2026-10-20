import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeRecommendationStatus } from './dashboard-canonical';

const root = process.cwd();

describe('recommendation state transition contract', () => {
  it('maps canonical OPEN state to the UI accepted state', () => {
    expect(normalizeRecommendationStatus('OPEN')).toBe('accepted');
    expect(normalizeRecommendationStatus('open')).toBe('accepted');
    expect(normalizeRecommendationStatus('approved')).toBe('approved');
    expect(normalizeRecommendationStatus('rejected')).toBe('rejected');
  });

  it('maps the UI accepted action to the canonical open RPC state', () => {
    const queries = fs.readFileSync(path.join(root, 'src/lib/queries.ts'), 'utf8');
    expect(queries).toContain("const nextStatus = status === 'accepted' ? 'open' : status;");
    expect(queries).toContain("supabase.rpc('update_recommendation_status'");
  });
});
