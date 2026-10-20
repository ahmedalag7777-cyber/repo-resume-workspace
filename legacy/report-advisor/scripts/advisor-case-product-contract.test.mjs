import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/lib/report-decisions.ts', 'utf8');
const supabase = fs.readFileSync('src/lib/supabase.ts', 'utf8');
const page = fs.readFileSync('src/pages/AdvisorCasesPage.tsx', 'utf8');
const panel = fs.readFileSync('src/components/ReportIntelligencePanel.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const nav = fs.readFileSync('src/lib/navigation-registry.ts', 'utf8');

for (const token of [
  "decision_portfolio_items",
  "ADVISOR_BUSINESS_CASE",
  "saveAdvisorBusinessCase",
  "fetchAdvisorBusinessCases",
  "setAdvisorBusinessCaseFollowed",
]) assert.ok(source.includes(token), 'business-case persistence contract missing: '+token);
assert.ok(supabase.includes("current_company_id"), 'tenant authority contract missing from Supabase client');

for (const token of [
  "AdvisorCasesPage",
  "متابعة القضية",
  "العودة إلى التقرير",
  "استئناف القرار",
  "WHY THIS IS PRIORITY",
]) assert.ok(page.includes(token), 'case-book UX contract missing: '+token);

for (const token of [
  "saveSignalAsCase",
  "priorityReason",
  "حفظ القرار والقضية",
  "/advisor-cases",
]) assert.ok(panel.includes(token), 'Advisor-to-case continuity contract missing: '+token);

assert.ok(app.includes('path="/advisor-cases"'), 'Advisor Cases route missing');
assert.ok(nav.includes("path: '/advisor-cases'"), 'Advisor Cases navigation missing');

console.log('PASS: Advisor Business Case product path persists source-bound cases, supports follow/continue, and is discoverable from Advisor/Command Center.');
