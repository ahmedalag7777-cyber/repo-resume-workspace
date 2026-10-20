import{strict as assert}from'node:assert';import{simulate}from'./integration-pipeline-simulation.mjs';
let r=simulate({});assert.equal(r.first.decision,'PASS');assert.equal(r.resilient.decision,'PASS');assert.equal(r.gate.ready,true);
r=simulate({fidelity:false});assert.equal(r.first.decision,'PASS');assert.equal(r.resilient.decision,'FALLBACK');assert.equal(r.gate.ready,false);
r=simulate({quality:.8});assert.equal(r.resilient.decision,'REVIEW');assert.equal(r.gate.ready,false);
r=simulate({arithmetic:false});assert.equal(r.first.decision,'QUARANTINE');assert.equal(r.resilient.decision,'QUARANTINE');assert.equal(r.gate.ready,false);
r=simulate({evidence:false});assert.equal(r.gate.failed[0],'evidence');console.log('Integrated pipeline simulation tests PASS.');