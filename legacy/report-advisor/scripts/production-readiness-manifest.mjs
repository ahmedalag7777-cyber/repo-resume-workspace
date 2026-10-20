export const productionReadiness={
  foundation:['typecheck','build','architecture-contracts'],
  files:['xlsx','csv','pdf-text','pdf-ocr','unknown-schema','corrupt-input'],
  intelligence:['semantic-mapping','normalization','anomaly-detection','evidence-chain','decision-gate'],
  finance:['reconciliation','currency-isolation','debit-credit','balance-integrity'],
  safety:['import-governance','business-key','tenant-isolation','rls','report-truth'],
  performance:['bounded-processing','cache-policy','concurrency','production-scale'],
  release:['scenario-matrix','regression-baseline','release-decision','failure-classification','evidence']
};
export function readinessDomains(){return Object.entries(productionReadiness).map(([domain,checks])=>({domain,checks,count:checks.length}));}
if(process.argv[1]?.endsWith('production-readiness-manifest.mjs'))console.log(`Production readiness manifest PASS: ${Object.keys(productionReadiness).length} domains.`);
