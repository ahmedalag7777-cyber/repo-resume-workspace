import{strict as assert}from'node:assert';import{inferFieldRole,resolveAmbiguity}from'./contextual-field-inference.mjs';
const debit=inferFieldRole({header:'',values:['10','20','5'],neighborHeaders:['التاريخ','مدين','دائن']});assert.equal(debit.role,'debit');assert.ok(debit.confidence>=.7);
const name=inferFieldRole({header:'',values:['سكر','أرز','زيت'],neighborHeaders:['رقم الصنف','الوحدة']});assert.equal(name.role,'name');
const weak=inferFieldRole({header:'',values:['1','2'],neighborHeaders:[]});assert.ok(weak.confidence<.7);
const r=resolveAmbiguity([debit,name,weak]);assert.equal(r.quarantine,true);assert.equal(r.accepted.length,2);assert.equal(r.rejected.length,1);console.log('Contextual field inference tests PASS.');
