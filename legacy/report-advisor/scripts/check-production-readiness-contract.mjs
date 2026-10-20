import fs from 'node:fs';
const source = fs.readFileSync('src/lib/intelligence/productionReadiness.ts','utf8');
for (const token of ['evaluateProductionReadiness','BLOCKER','WARNING','ready','score']) if (!source.includes(token)) throw new Error(`production-readiness: missing ${token}`);
console.log('production-readiness-contract: PASS');
