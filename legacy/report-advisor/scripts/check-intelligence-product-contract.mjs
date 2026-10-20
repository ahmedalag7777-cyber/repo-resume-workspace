import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/pages/IntelligencePage.tsx', 'utf8');

for (const token of [
  'fetchRecommendations',
  'fetchAlerts',
  'fetchForecasts',
  'updateRecommendationStatus',
  'DeterministicIntelligenceAssistant',
  'ForecastChart',
  'PriorityBadge',
  'ConfidenceBadge',
  'activeAlerts',
  'newRecommendations',
  'companyForecasts',
  'مساحة القرار',
  'FORECAST',
]) {
  assert.ok(source.includes(token), 'intelligence product contract missing: ' + token);
}

for (const token of [
  /<Card>/,
  /activeAlerts\.slice/,
  /newRecommendations\.slice/,
  /forecastChartData/,
  /updateRecommendationStatus/,
  /EmptyState/,
]) {
  assert.match(source, token);
}

assert.ok(!/Math\.random\(|fake|mock/i.test(source), 'synthetic marker detected');
const advisorSource = fs.readFileSync('src/components/ReportIntelligencePanel.tsx', 'utf8');

for (const token of [
  'BUSINESS QUESTION',
  'EVIDENCE PASSPORT',
  'OBSERVED · Source',
  'DERIVED · Intelligence',
  'RECOMMENDED · Proposal',
  'SO WHAT',
  'WHAT NEXT',
  'ACTION BRIEF',
  'sourceHash',
  'sourceTrustState',
  'createdAt',
]) {
  assert.ok(advisorSource.includes(token), 'advisor value surface contract missing: ' + token);
}
console.log('Intelligence product contract: PASS');
