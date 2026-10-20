import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'services/document-intelligence/app/pipeline.py',
  'services/document-intelligence/app/intermediate_model.py',
  'services/document-intelligence/tests/test_pipeline.py',
  'services/document-intelligence/tests/test_intermediate_model_contract.py',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Document intelligence closure dependency missing: ${file}`);
}
const pipeline = fs.readFileSync(path.join(root, required[0]), 'utf8');
const model = fs.readFileSync(path.join(root, required[1]), 'utf8');
for (const token of ['inspect_bytes', 'classify_route', 'confidence_gate', 'source_sha256', 'process_with_parser']) {
  if (!pipeline.includes(token)) throw new Error(`Pipeline contract missing: ${token}`);
}
for (const token of ['Provenance', 'Cell', 'Table', 'DocumentEnvelope', 'can_transition']) {
  if (!model.includes(token)) throw new Error(`Intermediate model contract missing: ${token}`);
}
if (!model.includes('bbox') || !model.includes('page') || !model.includes('row') || !model.includes('column')) {
  throw new Error('Cell-level lineage coordinates are incomplete');
}
console.log('DOCUMENT INTELLIGENCE CLOSURE: PASS (static boundary and lineage contract present)');
