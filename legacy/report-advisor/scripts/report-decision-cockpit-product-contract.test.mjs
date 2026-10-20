import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/components/ReportDecisionCockpit.tsx', 'utf8');
const required = ['WHAT NEXT / DECISION BRIEF','مرصود','مشتق','موصى به','متوقع','غير معلوم / الحدود','EXPECTED النتيجة','حفظ كقضية أعمال','فتح القضايا','افتح الدليل قبل القرار'];
for (const token of required) assert.ok(source.includes(token), `missing cockpit value contract: ${token}`);
assert.ok(source.includes('topRecommendation?.action'));
assert.ok(source.includes('saveAdvisorBusinessCase'));
assert.ok(source.includes('createSourceDecisionProposal'));
assert.ok(source.includes('data-testid="save-decision-case"'));
assert.ok(source.includes("forecast.status === 'AVAILABLE'"));
assert.ok(source.includes("forecast.status === 'INSUFFICIENT_SAMPLE'"));
console.log('PASS: Decision Cockpit exposes evidence-labeled next-best-action and fail-closed projection states.');