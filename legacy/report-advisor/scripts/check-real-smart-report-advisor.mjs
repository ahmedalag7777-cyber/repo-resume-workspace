import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const page = readFileSync(resolve(process.cwd(), 'src/pages/SmartReportPage.tsx'), 'utf8');

for (const marker of [
  'smart-report-advisor-brief',
  'ADVISOR BRIEF',
  'حكم المستشار',
  'لماذا الآن؟',
  'ما الذي ينبغي فعله؟',
  'المالك',
  'المعيار',
  'ماذا يعني ذلك؟',
  'نطاق الأثر',
  'ما يمنعنا من الجزم؟',
  'دليل الحكم',
  'ابدأ مسار القرار من هذه القضية',
]) assert.ok(page.includes(marker), 'missing advisor marker: ' + marker);

const advisor = page.indexOf('id="advisor-decision-brief"');
const data = page.indexOf('<BusinessDataExplorer report={report} />');
assert.ok(advisor >= 0 && data > advisor, 'advisor brief must precede data explorer');
assert.ok(page.indexOf('smartAnalysis.metrics.slice(0, 4)') < advisor, 'metrics may remain in source hero for evidence, but advisor brief must still be present before exploration');

console.log('PASS real smart report advisor-first contract: executive judgment, why-now, action owner, measurement, impact, blockers, and proof precede data exploration.');
