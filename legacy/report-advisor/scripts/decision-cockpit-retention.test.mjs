import fs from 'node:fs';

const fail = (message) => { throw new Error(message); };
const source = fs.readFileSync(new URL('../src/components/ReportDecisionCockpit.tsx', import.meta.url), 'utf8');

if (/report\.intelligence\.signals\.slice\(0,\s*3\)/.test(source)) fail('Decision Cockpit truncates signals to three items');
if (/report\.intelligence\.recommendations\.slice\(0,\s*3\)/.test(source)) fail('Decision Cockpit truncates recommendations to three items');
if (!source.includes('const signals = report.intelligence.signals;')) fail('Decision Cockpit must retain full signal collection');
if (!source.includes('const recommendations = report.intelligence.recommendations;')) fail('Decision Cockpit must retain full recommendation collection');

console.log('decision-cockpit-retention: PASS');
