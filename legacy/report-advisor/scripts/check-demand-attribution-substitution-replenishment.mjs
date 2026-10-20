import fs from 'node:fs';
const checks = [
  ['src/lib/intelligence/demandAttribution.ts',['attributeDemand','unfulfilledKg','customerId','sku']],
  ['src/lib/intelligence/groupSubstitution.ts',['aggregateGroupSubstitution','substitutionGapKg','effectiveSupplyKg','substitutability']],
  ['src/lib/intelligence/replenishmentOptimizer.ts',['optimizeReplenishment','protectedLiquidity','suggestedPurchaseKg','BLOCKED']],
];
for (const [file,tokens] of checks) {
  const source = fs.readFileSync(file,'utf8');
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${file}: missing ${token}`);
}
console.log('demand-attribution-substitution-replenishment: PASS');
