import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

for (const token of [
  'fetchDashboardSnapshot',
  'fetchDashboardIntelligence',
  'metricStatus',
  'liveAlerts',
  'liveRecommendations',
  'TREND_RANGES',
  'formatCurrency',
  'CardHeader',
]) {
  assert.ok(source.includes(token), 'dashboard UI contract missing: ' + token);
}

for (const token of [
  /kpis\.totalSales/,
  /kpis\.grossProfit/,
  /kpis\.totalReceivables/,
  /kpis\.inventoryValue/,
  /aging\.rows/,
  /liveAlerts/,
  /liveRecommendations/,
  /TREND_RANGES\.map/,
  /<section/,
]) {
  assert.match(source, token);
}

assert.ok((source.match(/<Card>/g) || []).length >= 4, 'dashboard UI contract requires multiple analytical surfaces');
assert.ok(source.includes('TruthContextStrip'), 'dashboard UI contract requires visible truth context');

console.log('Executive dashboard UI contract: PASS');
