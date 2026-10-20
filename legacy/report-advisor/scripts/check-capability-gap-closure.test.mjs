import {strict as assert} from 'node:assert';
import {capabilityCoverage} from './check-capability-gap-closure.mjs';
const good={};
const domains={schema:['header-aliases','unknown-schema-discovery','headerless-reverse-schema','field-normalization'],documents:['xlsx','csv','pdf-text','pdf-ocr','table-extraction','document-classification'],financial:['debit-credit','balance-integrity','multi-currency','reconciliation','exchange-statements'],imports:['preview','dedupe','business-key','transactional-upsert','rollback','quarantine'],intelligence:['entity-resolution','anomaly-detection','evidence-fusion','decision-trace','what-if'],safety:['tenant-isolation','rls','direct-write-guard','report-truth','privacy'],scale:['bounded-processing','workers','cache','concurrency','large-file-regression'],release:['golden-datasets','scenario-regression','evidence-gate','production-closure']};
for(const [d,items] of Object.entries(domains))for(const i of items)good[`${d}.${i}`]=true;
assert.equal(capabilityCoverage(good).complete,true);
delete good['documents.pdf-ocr'];const r=capabilityCoverage(good);assert.equal(r.complete,false);assert.ok(r.missing.includes('documents.pdf-ocr'));
console.log('Capability gap closure tests PASS.');
