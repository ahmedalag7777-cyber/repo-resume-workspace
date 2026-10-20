import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/pages/ReportsPage.tsx', import.meta.url), 'utf8');
if (!source.includes('{(metricColumns.length ? metricColumns : [{name:\'metric\'} as any]).map')) {
  throw new Error('Source-bound domain surface must render the complete metric collection');
}
if (source.includes('metricColumns.slice(0,4)')) throw new Error('Source-bound domain metrics must not be capped at four items');
console.log('source-domain-metrics-retention: PASS');
