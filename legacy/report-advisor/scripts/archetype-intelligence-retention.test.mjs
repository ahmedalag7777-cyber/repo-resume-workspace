import { getReportArchetype } from '../src/lib/report-intelligence/archetype-registry.ts';
import { applyArchetypeRuleSet } from '../src/lib/report-intelligence/archetype-evaluator.ts';

const fail = (message) => { throw new Error(message); };

const profile = getReportArchetype('sales.over-time');
if (!profile) fail('sales.over-time archetype missing');

const base = {
  signals: Array.from({ length: 20 }, (_, index) => ({
    id: 'signal-' + index,
    severity: 'medium',
    title: 'Signal ' + index,
    message: 'signal-' + index,
    evidence: ['fixture'],
    soWhat: 'review',
    impact: 'unproven',
  })),
  findings: Array.from({ length: 12 }, (_, index) => ({
    id: 'finding-' + index,
    kind: 'FINDING',
    priority: 'medium',
    title: 'Finding ' + index,
    statement: 'finding-' + index,
    evidence: ['fixture'],
    action: 'review',
  })),
  risks: [],
  opportunities: [],
  recommendations: Array.from({ length: 12 }, (_, index) => ({
    id: 'rec-fixture-' + index,
    status: 'PROPOSED',
    priority: 'medium',
    title: 'Recommendation ' + index,
    action: 'review',
    why: 'fixture',
    evidence: ['fixture'],
    ownerHint: 'owner',
    impact: 'unproven',
    expectedOutcome: 'retest',
  })),
  advisorBrief: {
    topFinding: null,
    recommendedAction: 'review',
    headline: 'fixture',
    ownerHint: 'owner',
    expectedOutcome: 'retest',
    measurement: 'retest',
    proofRequirement: 'source-bound',
  },
};

const report = {
  specialty: 'sales',
  rowCount: 12,
  canonicalRows: [
    { data: { documentDate: '2026-01-01', netAmount: 100 } },
    { data: { documentDate: '2026-02-01', netAmount: 150 } },
  ],
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'documentDate', mappedField: 'documentDate' },
        { name: 'netAmount', mappedField: 'netAmount' },
      ],
    }],
  },
};

const result = applyArchetypeRuleSet(profile, report, base);

if (result.findings.length !== 13) fail('Archetype evaluator truncated findings: ' + result.findings.length);
if (!result.findings.some((item) => item.id === 'finding-11')) fail('Finding beyond legacy cutoff was dropped');
if (result.recommendations.length !== 13) fail('Archetype evaluator truncated recommendations: ' + result.recommendations.length);
if (!result.recommendations.some((item) => item.id === 'rec-fixture-11')) fail('Recommendation beyond legacy cutoff was dropped');
if (result.signals.length !== 21) fail('Archetype evaluator truncated signals: ' + result.signals.length);
if (!result.signals.some((item) => item.id === 'signal-19')) fail('Signal beyond legacy cutoff was dropped');
if (!result.intelligence) { /* compatibility guard for accidental shape changes */ }

console.log('archetype-intelligence-retention: PASS');
