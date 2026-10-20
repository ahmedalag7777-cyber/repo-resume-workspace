import fs from 'node:fs';

const fail = (message) => { throw new Error(message); };

const advisorySurface = fs.readFileSync(new URL('../src/components/SmartReportAdvisorySurface.tsx', import.meta.url), 'utf8');
const intelligencePanel = fs.readFileSync(new URL('../src/components/ReportIntelligencePanel.tsx', import.meta.url), 'utf8');

if (/decisionClaims\s*=.*slice\(0,\s*6\)/.test(advisorySurface)) fail('Decision claims are still truncated to six items');
if (!advisorySurface.includes('decisionClaims.map((claim) =>')) fail('Decision claims must render as a complete collection');

for (const pattern of [
  /priorityReason\.slice\(0,/,
  /drivers \?\? \[\]\)\.slice\(0,/,
  /driver\.proof\.slice\(0,/,
  /signal\.evidence\.slice\(0,/,
]) {
  if (pattern.test(intelligencePanel)) fail('Intelligence evidence detail is still artificially truncated: ' + pattern);
}

if (!intelligencePanel.includes('signal.evidence.map((evidence) =>')) fail('Signal evidence must render completely');

console.log('advisory-surface-retention: PASS');
