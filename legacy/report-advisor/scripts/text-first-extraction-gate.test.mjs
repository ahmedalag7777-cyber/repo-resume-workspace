import{strict as assert}from'node:assert';import{planExtraction,validateTextArtifact,gateForAnalysis}from'./text-first-extraction-gate.mjs';
assert.equal(planExtraction('report.xlsx').mode,'extract_to_canonical_text');assert.equal(planExtraction('statement.pdf').mode,'extract_to_canonical_text');assert.equal(planExtraction('notes.txt').mode,'direct_text');
const good=validateTextArtifact({sourceHash:'sha-source',text:'# report\n|A|B|',artifactHash:'sha-text',sourceType:'pdf'});assert.equal(good.valid,true);assert.equal(gateForAnalysis(good),'ANALYZE_CANONICAL_TEXT');
const bad=validateTextArtifact({sourceHash:'sha-source',text:'',artifactHash:'sha-text',sourceType:'pdf'});assert.equal(bad.valid,false);assert.equal(gateForAnalysis(bad),'QUARANTINE_EXTRACTION');assert.ok(bad.errors.includes('TEXT_ARTIFACT_EMPTY'));
console.log('Text-first extraction gate tests PASS.');
