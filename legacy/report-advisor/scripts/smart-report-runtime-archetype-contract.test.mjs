import fs from 'node:fs';

const smartReport = fs.readFileSync(new URL('../src/lib/report-smart.ts', import.meta.url), 'utf8');
const advisory = fs.readFileSync(new URL('../src/components/SmartReportAdvisorySurface.tsx', import.meta.url), 'utf8');

for (const marker of [
  'archetypeId: detectedArchetype.profile?.id ?? null',
  'archetypeVersion: detectedArchetype.profile?.version ?? null',
  'profileVersion: detectedArchetype.profile?.version ?? null',
  'archetypeState,',
  'archetypeReason: detectedArchetype.reason',
]) {
  if (!smartReport.includes(marker)) throw new Error('Smart report runtime archetype metadata missing: ' + marker);
}
if (!advisory.includes('report.renderedOutput.archetypeId')) throw new Error('Advisory surface must consume renderedOutput archetype identity');

console.log('smart-report-runtime-archetype-contract: PASS');
