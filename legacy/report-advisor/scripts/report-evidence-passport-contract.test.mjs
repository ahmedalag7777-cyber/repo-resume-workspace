import assert from 'node:assert/strict';
import fs from 'node:fs';

const cohortCandidateQuery = fs.readFileSync(
  'supabase/migrations/20261003202724_optimize_report_value_cohort_candidates_lookup.sql',
  'utf8',
);
const cohortCandidateIndex = fs.readFileSync(
  'supabase/migrations/20261010202632_report_value_cohort_candidates_source_index.sql',
  'utf8',
);
const cohortCandidateExpandedFormats = fs.readFileSync(
  'supabase/migrations/20261010211000_expand_report_value_cohort_xml_yaml_support.sql',
  'utf8',
);
const resolverScript = fs.readFileSync('scripts/resolve-e2e-report-context.mjs', 'utf8');
const cohortScript = fs.readFileSync('scripts/report-value-cohort.mjs', 'utf8');
const extractCohortSourcePathRegex = (source, label) => {
  const line = source.split('\n').find((candidate) => candidate.includes('source_path ~*'));
  assert.ok(line, label + ' must declare source-path eligibility');
  const operator = line.indexOf('~*');
  const start = line.indexOf("'", operator) + 1;
  const end = line.indexOf("'", start);
  assert.ok(operator >= 0 && start > operator && end > start, label + ' must use a quoted source-path regex');
  return line.slice(start, end);
};
assert.equal(
  extractCohortSourcePathRegex(cohortCandidateIndex, 'Cohort partial index'),
  extractCohortSourcePathRegex(cohortCandidateQuery, 'Cohort candidate RPC'),
  'Partial index and candidate RPC must use the exact same source-path regex or PostgreSQL may not consider the index usable',
);
assert.ok(cohortCandidateIndex.includes('idx_report_value_cohort_candidates_source'));
assert.ok(cohortCandidateIndex.includes('(source_hash, lower(source_path), company_id, id)'));

assert.ok(
  cohortCandidateExpandedFormats.includes("coalesce(fr.metadata->>'fixture_type','') <> 'synthetic-realistic'"),
  'Cohort RPC must exclude known synthetic fixture records by authoritative file metadata',
);
assert.ok(
  cohortCandidateExpandedFormats.includes("coalesce(fr.metadata->>'catalog_id','') <> 'report-intelligence.48'"),
  'Cohort RPC must exclude governed archetype fixtures by source metadata',
);
assert.ok(
  !cohortCandidateExpandedFormats.includes("source_path !~* '^(customer|product|invoice)-'"),
  'Cohort eligibility must not reject genuine uploads based only on their filenames',
);
assert.doesNotMatch(resolverScript, /customer\|product\|invoice\)-/);
assert.doesNotMatch(cohortScript, /syntheticPath/);

console.log('REPORT_VALUE_COHORT_INDEX_CONTRACT_PASS');

const expandedSourcePathRegexes = cohortCandidateExpandedFormats
  .split('\n')
  .filter((line) => line.includes('source_path ~*'))
  .map((line) => {
    const operator = line.indexOf('~*');
    const start = line.indexOf("'", operator) + 1;
    const end = line.indexOf("'", start);
    assert.ok(operator >= 0 && start > operator && end > start, 'Expanded-format predicate must be a quoted regex');
    return line.slice(start, end);
  });
assert.equal(expandedSourcePathRegexes.length, 2, 'Expanded migration must apply format predicate to both RPC and partial index');
assert.equal(expandedSourcePathRegexes[0], expandedSourcePathRegexes[1], 'Expanded migration RPC/index format predicates must be byte-identical');
assert.match(expandedSourcePathRegexes[0], /\|xml\|yaml\|yml\|/);
assert.ok(cohortCandidateExpandedFormats.includes('DROP INDEX IF EXISTS public.idx_report_value_cohort_candidates_source'));
assert.match(cohortCandidateExpandedFormats, /create or replace function public\.get_report_value_cohort_candidates/i);


const passportSchema = fs.readFileSync(
  'supabase/migrations/20261002143000_create_report_evidence_passport.sql',
  'utf8',
);
const passportRuntime = fs.readFileSync(
  'supabase/migrations/20261002144000_refresh_report_evidence_passport.sql',
  'utf8',
);
const passportGates = fs.readFileSync(
  'supabase/migrations/20261002145000_enforce_report_evidence_passport_gates.sql',
  'utf8',
);
const proposal = fs.readFileSync('src/lib/report-decisions.ts', 'utf8');
const reportPage = fs.readFileSync('src/pages/SmartReportPage.tsx', 'utf8');
const completion = fs.readFileSync('supabase/migrations/20261003141500_auto_refresh_report_evidence_passport_on_completion.sql', 'utf8');
const provenanceRepair = fs.readFileSync('supabase/migrations/20261003140500_reconcile_source_decision_passport_snapshot.sql', 'utf8');
const intelligencePanel = fs.readFileSync('src/components/ReportIntelligencePanel.tsx', 'utf8');
const decisionCockpit = fs.readFileSync('src/components/ReportDecisionCockpit.tsx', 'utf8');
const legacyRowCountRepair = fs.readFileSync(
  'supabase/migrations/20261009223526_reconcile_legacy_generic_import_rowcount_proof.sql',
  'utf8',
);
const checkpointOffsetRepair = fs.readFileSync(
  'supabase/migrations/20261009222216_fix_legacy_checkpoint_import_id_offset.sql',
  'utf8',
);
const sourceBoundRepair = fs.readFileSync(
  'supabase/migrations/20261009222131_harden_legacy_report_evidence_passport_refresh.sql',
  'utf8',
);
const corpusPassportRefresh = fs.readFileSync('scripts/refresh-governed-real-corpus-passports.mjs', 'utf8');

assert.ok(passportSchema.includes('report_evidence_snapshots'));
assert.ok(passportSchema.includes('report_evidence_passports'));
assert.ok(passportSchema.includes('company_id'));
assert.ok(passportSchema.includes('source_hash'));
assert.ok(passportSchema.includes('source_version_id'));
assert.ok(passportSchema.includes('analysis_snapshot_id'));
assert.ok(passportRuntime.includes('refresh_report_evidence_passport'));
assert.ok(passportRuntime.includes('DETERMINISTIC_SOURCE_BOUND'));
assert.ok(passportRuntime.includes('LEGACY_UNRESOLVED'));
assert.ok(passportRuntime.includes('evidenceSnapshotId'));
assert.ok(passportGates.includes('SOURCE_EVIDENCE_PASSPORT_REQUIRED'));
assert.ok(passportGates.includes('SOURCE_DECISION_EVIDENCE_PASSPORT_REQUIRED'));
assert.ok(passportGates.includes('SOURCE_WORK_EVIDENCE_PASSPORT_REQUIRED'));
assert.ok(proposal.includes("report_evidence_passports"));
assert.ok(proposal.includes("verification_status', 'VERIFIED'"));
assert.ok(proposal.includes('evidencePassportId'));
assert.ok(proposal.includes('confidence: null'));
assert.ok(proposal.includes("confidenceSemantics: 'NOT_ASSESSED'"));
assert.ok(!proposal.includes('confidence: 0.5'));
assert.ok(reportPage.includes('EVIDENCE PASSPORT'));
assert.ok(reportPage.includes('legacyPriorVerification'));
assert.ok(reportPage.includes('decisionReadiness'));
assert.ok(completion.includes('refresh_report_evidence_passport'));
assert.ok(completion.includes("'evidencePassportRefresh'"));
assert.ok(provenanceRepair.includes("repairedLegacyProposal"));
assert.ok(provenanceRepair.includes("evidencePassportId"));
assert.ok(intelligencePanel.includes("report.renderedOutput?.evidenceSnapshotId"));
assert.ok(!intelligencePanel.includes("evidenceSnapshotId: report.sourceAnalysis?.id"));
assert.ok(decisionCockpit.includes("report.renderedOutput?.evidenceSnapshotId"));
assert.ok(!decisionCockpit.includes("evidenceSnapshotId: report.sourceAnalysis.id"));
assert.ok(sourceBoundRepair.includes('jsonb_array_elements_text'), 'legacy import ID must be recovered only from the same report job checkpoint');
assert.ok(checkpointOffsetRepair.includes('substring(evidence_key.value from 8)'), 'checkpoint parsing must skip the import: prefix exactly');
assert.ok(!checkpointOffsetRepair.includes('substring(evidence_key.value from 7)'), 'checkpoint parsing must not include the delimiter in the import UUID');
assert.ok(legacyRowCountRepair.includes('coalesce(v_import.valid_rows,0) = 0'), 'legacy zero valid_rows is handled only as a missing aggregate, not as zero source rows');
assert.ok(legacyRowCountRepair.includes('v_commit_count = v_import.total_rows'), 'legacy zero valid_rows requires matching canonical commit row count');
assert.ok(legacyRowCountRepair.includes('v_canonical_count = v_import.total_rows'), 'legacy zero valid_rows requires matching canonical dataset row count');
assert.ok(legacyRowCountRepair.includes('v_analysis.row_count = v_import.total_rows'), 'legacy zero valid_rows requires matching analyzed row count');
assert.ok(legacyRowCountRepair.includes('v_import.total_rows = v_authoritative_count'), 'authoritative output must agree with the completed import count');
assert.ok(sourceBoundRepair.includes('source_fingerprint IS DISTINCT FROM v_job.source_hash'), 'passport refresh must validate import/source fingerprint');
assert.ok(sourceBoundRepair.includes("'sourceBound'"), 'legacy source-bound provenance must be explicit');
assert.ok(sourceBoundRepair.includes("'authoritativeCurrentRowCount'"), 'passport refresh must persist source-backed row count');
assert.ok(corpusPassportRefresh.includes('const jobsByHash = new Map()'), 'corpus job discovery must be batched by source hash');
assert.ok(corpusPassportRefresh.includes('offset += pageSize'), 'corpus job discovery must use bounded pagination');

console.log('REPORT_EVIDENCE_PASSPORT_CONTRACT_PASS');
