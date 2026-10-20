import assert from 'node:assert/strict';
const scores=[90,70,60], confidence=[90,80,75];
const priority=Math.round((0+scores.reduce((a,b)=>a+b,0))/4);
const avgConfidence=Math.round(confidence.reduce((a,b)=>a+b,0)/confidence.length);
assert.equal(priority,55);assert.equal(avgConfidence,82);assert.ok(priority>=45);console.log('decision arbitration fixture: PASS');
