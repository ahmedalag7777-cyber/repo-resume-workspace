import assert from 'node:assert/strict';
import { acceptExtractedFacts, attachExtractedFactsToLineage, extractedFactsToEvidence, type DocumentExtractionEnvelope, type DocumentExtractionFact } from '../src/lib/documentIntelligenceGateway.ts';

const envelope: DocumentExtractionEnvelope = {
  plan: { route: 'hybrid', steps: ['native text extraction', 'table extraction'], reason: 'test', qualityTarget: 95 },
  choices: [],
  stage: 'READY_FOR_EXTRACTION',
  warnings: [],
  facts: [],
};

const facts: DocumentExtractionFact[] = [
  { field: 'total', value: 1250, confidence: 0.95, source: 'invoice.pdf', page: 2, location: 'table:total', sourceDocumentId: 'doc-7', sourceHash: 'sha256:abc' },
  { field: 'missing', value: null, confidence: 0.91, source: 'invoice.pdf', page: 2, location: 'table:missing', sourceDocumentId: 'doc-7', sourceHash: 'sha256:abc' },
  { field: 'bad', value: 0, confidence: 1.2, source: 'invoice.pdf' },
  { field: 'ungrounded', value: 42, confidence: 0.9, source: '' },
];

const accepted = acceptExtractedFacts(envelope, facts);
assert.equal(accepted.facts.length, 2);
assert.equal(accepted.facts[1]?.value, null, 'NULL must remain NULL; provenance conversion must not coerce it to zero');

const evidence = extractedFactsToEvidence(accepted.facts);
assert.equal(evidence.length, 2);
assert.equal(evidence[0]?.sourceDocumentId, 'doc-7');
assert.equal(evidence[0]?.sourceHash, 'sha256:abc');
assert.equal(evidence[0]?.location, 'table:total');
assert.equal(evidence[1]?.normalized, null);

const sameLocationDifferentValues: DocumentExtractionFact[] = [
  { field: 'total', value: 1250, confidence: 0.95, source: 'invoice.pdf', page: 2, location: 'table:total', sourceDocumentId: 'doc-7', sourceHash: 'sha256:abc' },
  { field: 'total', value: 1500, confidence: 0.95, source: 'invoice.pdf', page: 2, location: 'table:total', sourceDocumentId: 'doc-7', sourceHash: 'sha256:abc' },
];
const collisionCheck = extractedFactsToEvidence(sameLocationDifferentValues);
assert.notEqual(collisionCheck[0]?.id, collisionCheck[1]?.id, 'evidence identity must distinguish conflicting values at the same source location');

const graph = attachExtractedFactsToLineage(
  { nodes: [{ id: 'recommendation-1', type: 'insight', label: 'Recommendation' }], edges: [] },
  accepted.facts,
  'recommendation-1',
);

assert.equal(graph.nodes.filter(n => n.id.startsWith('document-source:')).length, 1);
assert.equal(graph.nodes.filter(n => n.id.startsWith('document-fact:')).length, 2);
assert.equal(graph.edges.filter(e => e.label === 'extracted-from').length, 2);
assert.equal(graph.edges.filter(e => e.label === 'supports').length, 2);
assert.ok(graph.nodes.some(n => n.evidence?.some(e => e.sourceDocumentId === 'doc-7' && e.sourceHash === 'sha256:abc')));

const missingTarget = attachExtractedFactsToLineage(graph, accepted.facts, 'not-present');
assert.equal(missingTarget.nodes.length, graph.nodes.length);
assert.equal(missingTarget.edges.length, graph.edges.length);

console.log('document provenance runtime regression: PASS');