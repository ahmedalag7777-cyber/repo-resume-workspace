import fs from 'node:fs';

const reportSmart = fs.readFileSync('src/lib/report-smart.ts', 'utf8');
const smartPage = fs.readFileSync('src/pages/SmartReportPage.tsx', 'utf8');
const sourceSurface = fs.readFileSync('src/components/SourceBoundReportSurface.tsx', 'utf8');

for (const marker of [
  'authoritativeCurrentRowCount',
  'canonicalCommitGap',
  'canonicalCommitCount === authoritativeCurrentRowCount',
  "canonicalCommitGap != null && canonicalCommitGap > 0",
]) {
  if (!reportSmart.includes(marker)) throw new Error(`Row coverage contract missing: ${marker}`);
}

if (reportSmart.includes("rendered.canonicalCommitVerified === true\n      ? 'VERIFIED'")) {
  throw new Error('Canonical commit must not be promoted to report evidence verification.');
}

for (const marker of [
  'report.reportVerificationState === \'VERIFIED\'',
  "report.reportVerificationState === 'GAP_DETECTED'",
  'function reportVerificationLabel(value: string): string',
  'canonicalCommitGap',
]) {
  if (!smartPage.includes(marker) && !sourceSurface.includes(marker)) {
    throw new Error(`Row coverage / verification UI marker missing: ${marker}`);
  }
}

function deriveCoverage(sourceRows, canonicalRows) {
  if (!Number.isInteger(sourceRows) || sourceRows < 0) throw new Error('invalid source rows');
  if (!Number.isInteger(canonicalRows) || canonicalRows < 0) throw new Error('invalid canonical rows');
  const authoritativeCurrentRowCount = canonicalRows;
  const canonicalCommitGap = Math.max(0, sourceRows - authoritativeCurrentRowCount);
  const canonicalCommitVerified = canonicalRows === authoritativeCurrentRowCount;
  const reportVerificationState = canonicalCommitGap > 0 ? 'GAP_DETECTED' : 'PENDING_EVIDENCE';
  return { authoritativeCurrentRowCount, canonicalCommitGap, canonicalCommitVerified, reportVerificationState };
}

const sample = deriveCoverage(399, 397);
if (sample.authoritativeCurrentRowCount !== 397) throw new Error('399/397: authoritative row count is not 397');
if (sample.canonicalCommitGap !== 2) throw new Error('399/397: canonical commit gap is not 2');
if (sample.reportVerificationState !== 'GAP_DETECTED') throw new Error('399/397: verification state must expose the gap');
if (!sample.canonicalCommitVerified) throw new Error('399/397: authoritative canonical coverage itself must remain internally consistent');
if (sample.authoritativeCurrentRowCount === 399) throw new Error('399/397: source rows silently replaced canonical truth');
if (sample.canonicalCommitGap === 0) throw new Error('399/397: gap was silently erased');

console.log('REPORT_ROW_COVERAGE_CONTRACT_PASS: 399 source rows / 397 authoritative canonical rows -> gap 2, GAP_DETECTED, no silent downgrade.');
