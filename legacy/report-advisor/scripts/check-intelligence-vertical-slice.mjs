import { buildAdvisoryPacket } from '../src/lib/report-intelligence/report-advisory-orchestrator.ts';
import { buildDecisionPacket } from '../src/lib/report-intelligence/decision-packet-builder.ts';
import { validateAdvisoryInvariants } from '../src/lib/report-intelligence/advisory-invariants.ts';
import { buildOutcomeLearningBinding } from '../src/lib/report-intelligence/outcome-learning-binding.ts';

const check = (condition, message) => { if (!condition) throw new Error(message); };

const intelligence = {
  summary: 'يوجد استثناء يحتاج مراجعة قبل القرار.',
  signals: [{
    id: 'sales:date-missing',
    severity: 'medium',
    title: 'التاريخ غير مثبت',
    message: 'لا يوجد تاريخ واضح.',
    evidence: ['dateField=missing'],
  }],
  recommendations: [{
    id: 'rec:sales:date-missing',
    status: 'PROPOSED',
    priority: 'medium',
    title: 'راجع التاريخ',
    action: 'ثبّت تاريخًا موحدًا.',
    why: 'لا يوجد تاريخ واضح.',
    evidence: ['dateField=missing'],
  }],
  forecast: { status: 'INSUFFICIENT_SAMPLE', metric: null, method: 'deterministic-monthly-trend', observedPeriods: 0, nextPeriod: null, nextValue: null, direction: null, note: 'لا يوجد توقع.' },
  guidance: { focus: 'التاريخ غير مثبت', inspect: ['لا يوجد تاريخ واضح.'], ownerHint: 'المسؤول', boundary: 'تحتاج مراجعة.' },
};

const base = {
  intelligence,
  provenance: {
    tenantId: 'tenant-1',
    sourceHash: 'sha256:integration',
    reportExecutionJobId: 'job-1',
    evidenceSnapshotId: 'snapshot-1',
    evidencePassportId: 'passport-1',
  },
  availableFields: ['netAmount'],
  sampleSize: 20,
  archetypeId: 'sales.transaction-detail',
  profileVersion: 1,
};

const advisory = buildAdvisoryPacket(base);
check(advisory.proofState === 'VERIFIED', 'evidence should produce VERIFIED');
check(advisory.actionState === 'ACTIONABLE', 'verified recommendation should be actionable');
check(advisory.questions.find((q) => q.id === 'report.what-happened')?.state === 'ANSWERED', 'what-happened should be answered from source intelligence');
check(advisory.questions.find((q) => q.id === 'report.contributors')?.state === 'ANSWERED' || advisory.questions.find((q) => q.id === 'report.contributors')?.state === 'REVIEW_REQUIRED', 'contributors must have an explicit evidence state');
check(advisory.questions.find((q) => q.id === 'report.so-what')?.state === 'REVIEW_REQUIRED' || advisory.questions.find((q) => q.id === 'report.so-what')?.state === 'ANSWERED', 'so-what must have an explicit state');
check(Boolean(advisory.questions.find((q) => q.id === 'report.what-happened')?.followUpQuestion), 'answered questions must expose a contextual follow-up');
check(advisory.questions.find((q) => q.id === 'report.why')?.state === 'REVIEW_REQUIRED', 'why should retain causal review boundary');

const archetypeIntelligence = {
  ...intelligence,
  findings: [{
    id: 'sales:top-party',
    kind: 'FINDING',
    priority: 'high',
    title: 'تركيز العملاء',
    statement: 'العميل أ يمثل الحصة الأكبر من القيمة.',
    value: 70,
    unit: '%',
    dimensionLabel: 'العميل',
    dimensionValue: 'عميل أ',
    evidence: ['customerField=customerCode', 'share=70%'],
    limitation: 'التركيز وصفي ولا يثبت سبب التغير.',
    action: 'راجع الاعتماد على العميل قبل اعتماد قرار.',
  }],
  risks: [],
  opportunities: [],
  advisorBrief: {
    ...(intelligence.advisorBrief ?? {}),
    recommendedAction: 'راجع الاعتماد على العميل قبل اعتماد قرار.',
  },
};
const archetypePacket = buildAdvisoryPacket({
  ...base,
  intelligence: archetypeIntelligence,
  availableFields: ['netAmount', 'customerCode'],
  sampleSize: 20,
});
const concentrationQuestion = archetypePacket.questions.find((q) => q.id === 'sales.customer-concentration');
check(concentrationQuestion?.state === 'ANSWERED', 'answered archetype question must be marked ANSWERED');
check(String((concentrationQuestion?.answer && typeof concentrationQuestion.answer === 'object' ? concentrationQuestion.answer.summary : concentrationQuestion?.answer) ?? '').includes('العميل أ'), 'archetype answer must come from business intelligence');

const recommendation = advisory.nextRecommendation;
check(Boolean(recommendation), 'vertical slice needs a recommendation claim');

const packet = buildDecisionPacket({
  sourcePath: 'integration.xlsx',
  sourceHash: 'sha256:integration',
  reportExecutionJobId: 'job-1',
  evidenceSnapshotId: 'snapshot-1',
  evidencePassportId: 'passport-1',
  archetypeId: 'sales.transaction-detail',
  profileVersion: 1,
  businessQuestion: 'ما الخطوة التالية؟',
  questions: advisory.questions,
  claims: advisory.claims,
  readiness: 'READY_WITH_REVIEW',
  recommendationId: recommendation?.claimId ?? null,
  decisionId: 'decision-1',
  decisionStatus: 'EXECUTED',
  approvalStatus: 'APPROVED',
  workItemId: 'work-1',
  workStatus: 'COMPLETED',
  expectedOutcome: 'تحسن',
  actualOutcome: null,
  generatedAt: '2026-10-02T00:00:00Z',
});
check(packet.source.sourceHash === 'sha256:integration', 'decision packet source must match');
check(packet.action.actualOutcome === null, 'unmeasured actual outcome must remain null');

const invariant = validateAdvisoryInvariants(advisory, packet);
check(invariant.valid, 'advisory packet and decision packet must share lineage');

const learning = buildOutcomeLearningBinding({
  outcomeId: 'outcome-1',
  recommendationId: recommendation?.claimId ?? 'missing',
  archetypeId: 'sales.transaction-detail',
  profileVersion: 1,
  ruleId: recommendation?.ruleId ?? null,
  sourceHash: 'sha256:integration',
  reportExecutionJobId: 'job-1',
  evidenceSnapshotId: 'snapshot-1',
  expectedOutcome: 'تحسن',
});
check(learning.outcomeState === 'INSUFFICIENT', 'expected outcome alone must not be observed');

const broken = validateAdvisoryInvariants({
  ...advisory,
  claims: advisory.claims.map((claim, index) => index === 0 ? { ...claim, sourceHash: 'sha256:other' } : claim),
}, packet);
check(!broken.valid && broken.violations.includes('CLAIM_SOURCE_HASH_MISMATCH'), 'lineage drift must fail closed');

console.log('intelligence-vertical-slice: PASS');
