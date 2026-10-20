import{strict as assert}from'node:assert';import{fixtures,fixtureByType}from'./golden-realistic-fixtures.mjs';
assert.equal(fixtures.exchange_ar.rows.length,2);assert.equal(fixtures.inventory_ar.rows[0][4],'١٠');assert.equal(fixtureByType('exchange_statement').length,1);assert.equal(fixtures.unknown.type,'unknown');console.log('Golden realistic fixtures tests PASS.');
