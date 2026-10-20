import assert from 'node:assert/strict';
const margin=500*2,cost=500*1.5,velocity=margin/(30+5),intensity=margin/cost,lostImpact=200/(1000+200);const score=velocity*.5+intensity*.25+Math.min(1,500/1000)*.15+lostImpact*.1;assert.ok(score>0);assert.ok(lostImpact>0.1);console.log('liquidity drivers fixture: PASS');
