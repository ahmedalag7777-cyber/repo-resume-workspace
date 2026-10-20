import {strict as assert} from'node:assert';import{inferHeaderlessSchema}from'./headerless-reverse-schema.mjs';
const r=inferHeaderlessSchema([['1001','سكر','1','2026-08-23'],['1002','أرز','2','2026-08-24']]);assert.equal(r.mapping[0],'amount');assert.equal(r.mapping[1],'name');assert.equal(r.mapping[3],'date');assert.equal(r.quarantine,false);
const bad=inferHeaderlessSchema([['x','y'],['a','b']]);assert.equal(bad.quarantine,true);assert.ok(bad.confidence<.5);console.log('Headerless reverse schema tests PASS.');
