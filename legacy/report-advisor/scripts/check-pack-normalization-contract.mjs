import fs from 'node:fs';
const source = fs.readFileSync('src/lib/intelligence/packNormalization.ts', 'utf8');
for (const token of ['normalizePack', 'netWeightKg', 'convertQuantityToKg', 'convertKgToQuantity', 'PACK_WEIGHT_REQUIRED']) {
  if (!source.includes(token)) throw new Error(`pack-normalization: missing ${token}`);
}
console.log('pack-normalization-contract: PASS');
