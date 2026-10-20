import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/pages/CanonicalImportPage.tsx', 'utf8');

assert.match(source, /type="file"/, 'file input must remain available');
assert.match(source, /multiple/, 'multi-source selection must be explicit');
assert.match(source, /onDrop=\{\(event\) =>/, 'drop handling must be implemented');
assert.match(source, /const queueFiles = useCallback/, 'queued source handling must exist');
assert.match(source, /سلة المصادر/, 'customer-facing queue label must be present');
assert.match(source, /لن يتم دمج هذه التقارير/, 'separate report lineage must be explicit');
assert.match(source, /تحليل هذا المصدر/, 'each queued source must have an explicit analysis action');
assert.match(source, /setQueuedFiles\(\(current\) => current\.filter/, 'queued sources must be removable');

const handleFilePosition = source.indexOf('const handleFile = useCallback');
const queuedHandlerPosition = source.indexOf('const analyzeQueuedFile = useCallback');
assert.ok(handleFilePosition >= 0 && queuedHandlerPosition > handleFilePosition, 'queued analysis handler must be declared after the canonical file handler');

const handleFileCount = (source.match(/const handleFile = useCallback/g) ?? []).length;
assert.equal(handleFileCount, 1, 'there must be exactly one canonical single-file analysis handler');

console.log('source-upload-ui-contract: PASS');
