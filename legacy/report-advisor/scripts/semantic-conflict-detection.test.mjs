import{strict as assert}from'node:assert';import{detectConflicts}from'./semantic-conflict-detection.mjs';
const ok=detectConflicts({reportType:'exchange_statement',fields:{debit:'مدين',credit:'دائن',currency:'العملة'},rows:[{'مدين':'10','دائن':'0','العملة':'YER'},{'مدين':'0','دائن':'20','العملة':'YER'}]});assert.equal(ok.valid,true);
const both=detectConflicts({reportType:'exchange_statement',fields:{debit:'d',credit:'c'},rows:[{d:'10',c:'5'}]});assert.equal(both.valid,false);assert.equal(both.conflicts[0].code,'BOTH_DEBIT_CREDIT');
const multi=detectConflicts({reportType:'exchange_statement',fields:{currency:'cur'},rows:[{cur:'YER'},{cur:'USD'}]});assert.equal(multi.valid,false);assert.equal(multi.conflicts[0].code,'MULTI_CURRENCY');
console.log('Semantic conflict detection tests PASS.');
