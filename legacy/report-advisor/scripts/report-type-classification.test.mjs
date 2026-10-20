import{strict as assert}from'node:assert';import{classifyReport,requireReportTypeConfidence}from'./report-type-classification.mjs';
const r=classifyReport({headers:['رقم الصنف','اسم الصنف','المخزن','الرصيد','متوسط التكلفة','الكمية']});assert.equal(r.type,'inventory');assert.ok(r.confidence>=.55);assert.equal(requireReportTypeConfidence(r).accepted,true);
const e=classifyReport({headers:['التاريخ','مدين','دائن','الرصيد','العملة']});assert.equal(e.type,'exchange_statement');assert.equal(requireReportTypeConfidence(e).accepted,true);
const u=classifyReport({headers:['foo','bar','baz']});assert.equal(u.type,'unknown');assert.equal(requireReportTypeConfidence(u).quarantine,true);console.log('Report type classification tests PASS.');
