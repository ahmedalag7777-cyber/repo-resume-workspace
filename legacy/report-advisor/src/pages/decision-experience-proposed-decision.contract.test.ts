import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/pages/DecisionExperiencePage.tsx'),
  'utf8',
);

describe('decision experience proposed-decision reuse contract', () => {
  it('reuses an existing decision before validating new-decision numeric fields', () => {
    const existingDecisionBranch = source.indexOf('if (decisionContext.decision) {');
    const expectedImpactValidation = source.indexOf("if (!Number.isFinite(expectedImpact)) {");
    const confidenceValidation = source.indexOf("if (!Number.isFinite(confidence)");
    expect(existingDecisionBranch).toBeGreaterThan(-1);
    expect(expectedImpactValidation).toBeGreaterThan(existingDecisionBranch);
    expect(confidenceValidation).toBeGreaterThan(existingDecisionBranch);
  });

  it('does not invent missing expected impact or confidence for an existing proposal', () => {
    expect(source).toContain("decisionContext.decision.status !== 'PROPOSED'");
    expect(source).toContain("لا يمكن إنشاء قرار جديد بلا أثر متوقع رقمي مثبت.");
  });
});
