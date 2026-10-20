import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/pages/OnboardingPage.tsx', import.meta.url), 'utf8');
for (const marker of ['من أول تقرير إلى قرار قابل للتنفيذ','الحقيقة أولًا','المستشار الحقيقي','قرار موثق','عمل ونتيجة']) {
  if (!source.includes(marker)) throw new Error('Commercial onboarding value marker missing: ' + marker);
}
if (!source.includes('to="/import"')) throw new Error('Commercial onboarding must expose the primary report-upload CTA');
if (!source.includes('to="/command-center"')) throw new Error('Commercial onboarding must expose the command-center CTA');
if (!source.includes('verifiedReportCount')) throw new Error('Onboarding readiness evidence marker missing: verifiedReportCount');

if (!source.includes('report_evidence_passports')) throw new Error('Onboarding readiness evidence marker missing: report_evidence_passports');

if (!source.includes('verification_status')) throw new Error('Onboarding readiness evidence marker missing: verification_status');

if (!source.includes('decision_readiness')) throw new Error('Onboarding readiness evidence marker missing: decision_readiness');

console.log('commercial-onboarding-experience: PASS');
