import fs from 'node:fs';

const source = fs.readFileSync('src/lib/intelligence/unified-decision-chain.ts', 'utf8');
const required = [
  'buildUnifiedDecisionChain',
  'effectiveDemandUnits',
  'effectiveSellableUnits',
  'stockoutExposureUnits',
  'lostSalesExposureUnits',
  'alternativeCoverageDays',
  'liquidityPressureMinor',
  "'Fresh' | 'Warning' | 'Stale' | 'Critical' | 'Unknown'",
  "'BUY_NOW' | 'BUY_SOON' | 'MONITOR' | 'DO_NOT_BUY'",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Unified decision-chain contract missing: ${token}`);
}

if (!source.includes('openRequests') || !source.includes('alternatives.reduce')) {
  throw new Error('Decision chain must include customer requests and alternative-group stock.');
}
if (!source.includes('operatingReserveMinor') || !source.includes('liquidityPressure')) {
  throw new Error('Decision chain must protect operating cash reserve.');
}
if (!source.includes('Stale') || !source.includes('Unknown')) {
  throw new Error('Decision chain must gate stale/unknown evidence.');
}
console.log('Unified decision-chain contract: PASS');
