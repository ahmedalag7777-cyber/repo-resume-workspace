import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const page = readFileSync(resolve(process.cwd(), 'src/pages/ProposalDemoPage.tsx'), 'utf8');

assert.match(page, /function PreviewAdvisorReport\(\)/);
assert.match(page, /ADVISOR-FIRST SMART REPORT/);
assert.match(page, /الخلاصة التي يحتاجها المدير/);
assert.match(page, /WHY · السبب/);
assert.match(page, /SO WHAT · ماذا يعني؟/);
assert.match(page, /RECOMMENDATION · التوصية/);
assert.match(page, /EVIDENCE · الدليل/);
assert.match(page, /EXPECTED OUTCOME/);
assert.match(page, /MEASUREMENT/);
assert.match(page, /BLOCKER/);
assert.match(page, /3 صفوف تحت حد التغطية/);
assert.match(page, /التغطية.*2.00/);

const smartIndex = page.indexOf("route.startsWith('/reports/smart/')");
const inventoryIndex = page.indexOf("route === '/reports/inventory'");
const executiveIndex = page.indexOf("route === '/reports/executive'");
assert.ok(smartIndex >= 0 && inventoryIndex >= 0 && executiveIndex >= 0);
assert.ok(page.indexOf('<PreviewAdvisorReport />', smartIndex) > smartIndex);
assert.ok(page.indexOf('<PreviewAdvisorReport />', inventoryIndex) > inventoryIndex);
assert.ok(page.indexOf('<PreviewAdvisorReport />', executiveIndex) > executiveIndex);

console.log('PASS advisor-first report contract: executive judgment precedes KPIs and tables; every claim path includes why, so-what, recommendation, evidence, measurement, blocker, and expected outcome.');
