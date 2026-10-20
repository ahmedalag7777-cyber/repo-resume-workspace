import fs from 'node:fs';

const guard = fs.readFileSync('src/pages/ScenarioTruthGuardPage.tsx', 'utf8');
const simulator = fs.readFileSync('src/pages/CanonicalScenarioPage.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');

const requiredPatterns = [
  /fetchProfitabilitySnapshot\(\)/,
  /snapshot\.status\s*===\s*['"]CALCULATED['"]/, 
  /snapshot\.revenue\s*!==\s*null/,
  /snapshot\.cost\s*!==\s*null/,
  /setFinancials\(\{[\s\S]*revenue:\s*snapshot\.revenue,[\s\S]*cost:\s*snapshot\.cost[\s\S]*\}\)/,
  /<CanonicalScenarioPage\s+baseRevenue=\{financials\.revenue\}\s+baseCost=\{financials\.cost\}/,
];
for (const pattern of requiredPatterns) {
  if (!pattern.test(guard)) throw new Error(`Scenario truth guard missing required boundary: ${pattern}`);
}

for (const pattern of [
  /baseRevenue:\s*number/,
  /baseCost:\s*number/,
  /formatCurrency\(baseRevenue,\s*currency\)/,
  /formatCurrency\(baseCost,\s*currency\)/,
]) {
  if (!pattern.test(simulator)) throw new Error(`Canonical scenario simulator missing required input boundary: ${pattern}`);
}

if (!simulator.includes('baseProfit === 0 ? null')) {
  throw new Error('Scenario simulator must fail safely when base profit is zero');
}

if (!app.includes('path="/intelligence/scenarios" element={<ScenarioTruthGuardPage />}')) {
  throw new Error('Scenario route must use the financial-truth guard');
}

if (app.includes('path="/intelligence/scenarios" element={<ScenariosPage />}')) {
  throw new Error('Scenario route must not bypass the financial-truth guard');
}

console.log('Scenario financial truth guard: PASS');
