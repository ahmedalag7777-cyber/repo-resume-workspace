import assert from 'node:assert/strict';
const key={tenantId:'t1',scope:'group:A',period:'30d',version:'v1'};
const hit={tenantId:'t1',dependency:'inventory',entityIds:['A'],at:1};
const miss={tenantId:'t2',dependency:'inventory',entityIds:['A'],at:1};
const config={tenantId:'t1',dependency:'forecast-config',entityIds:[],at:1};
const invalidates=(e,k)=>e.tenantId===k.tenantId&&(e.dependency==='forecast-config'||!e.entityIds.length||e.entityIds.some(id=>k.scope.toLowerCase().includes(id.toLowerCase())));
assert.equal(invalidates(hit,key),true);assert.equal(invalidates(miss,key),false);assert.equal(invalidates(config,key),true);console.log('analysis invalidation fixture: PASS');
