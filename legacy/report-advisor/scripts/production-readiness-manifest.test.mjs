import {strict as assert} from 'node:assert';
import {productionReadiness,readinessDomains} from './production-readiness-manifest.mjs';
const domains=readinessDomains();
assert.equal(domains.length,7);
for(const d of ['foundation','files','intelligence','finance','safety','performance','release'])assert.ok(productionReadiness[d]?.length>0,`empty domain ${d}`);
assert.ok(productionReadiness.release.includes('evidence'));
assert.ok(domains.reduce((n,d)=>n+d.count,0)>=25);
console.log('Production readiness manifest tests PASS.');
