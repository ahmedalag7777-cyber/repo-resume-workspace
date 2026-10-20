import {strict as assert} from 'node:assert';
import {scenarios} from './production-scenario-matrix.mjs';
assert.ok(scenarios.length>=12);
for(const id of ['excel-standard','excel-aliases','pdf-ocr-ar','unknown-report','exchange-statement','multi-currency','large-file','corrupt-data'])assert.ok(scenarios.some(s=>s.id===id),`missing scenario ${id}`);
console.log('Production scenario matrix tests PASS.');
