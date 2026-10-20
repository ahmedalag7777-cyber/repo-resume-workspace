import fs from 'node:fs';

const fail = (message) => { throw new Error(message); };
const source = fs.readFileSync(new URL('../src/components/SourceBoundReportSurface.tsx', import.meta.url), 'utf8');

if (/\.filter\(\(metric\) => metric\.value != null\)\s*\.slice\(0,\s*6\)/.test(source)) {
  fail('Source metrics are still truncated to six items');
}
if (!source.includes('.filter((metric) => metric.value != null);')) {
  fail('Source metrics collection is not retained in full');
}

console.log('source-metrics-retention: PASS');
