import{strict as assert}from'node:assert';import{scoreExtractionQuality,qualityDecision}from'./extraction-quality-score.mjs';
const high=scoreExtractionQuality({textConfidence:1,layoutScore:1,ocrConfidence:1,semanticConfidence:1,coverage:1});assert.equal(high.level,'high');assert.equal(qualityDecision(high),'PASS');
const mid=scoreExtractionQuality({textConfidence:.8,layoutScore:.8,ocrConfidence:.8,semanticConfidence:.8,coverage:.8});assert.equal(mid.level,'medium');assert.equal(qualityDecision(mid),'FALLBACK_OR_REVIEW');
const low=scoreExtractionQuality({textConfidence:.2,layoutScore:.2,ocrConfidence:.2,semanticConfidence:.2,coverage:.2});assert.equal(low.level,'low');assert.equal(qualityDecision(low),'QUARANTINE');console.log('Extraction quality score tests PASS.');
