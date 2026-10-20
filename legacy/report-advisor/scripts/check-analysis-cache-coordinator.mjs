import assert from 'node:assert/strict';
const cache={value:{answer:42},meta:{createdAt:0,ttlMs:1000,version:'v1'}};
let computes=0;
function run(version,now){const m=cache.meta;const fresh=now-m.createdAt<=m.ttlMs;if(fresh&&version===m.version)return {status:'hit',value:cache.value};computes++;cache.value={answer:43};cache.meta={createdAt:now,ttlMs:1000,version};return {status:'refreshed',value:cache.value};}
assert.equal(run('v1',100).status,'hit');assert.equal(run('v2',100).status,'refreshed');assert.equal(computes,1);console.log('analysis cache coordinator fixture: PASS');
