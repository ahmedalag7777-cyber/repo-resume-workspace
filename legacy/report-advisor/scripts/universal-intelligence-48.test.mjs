import fs from 'node:fs/promises';
import path from 'node:path';
import { parseFile } from '../src/lib/file-engine/adapters.ts';
import { buildUniversalReportIntelligence } from '../src/lib/universal-report-intelligence.ts';
import { listReportArchetypes } from '../src/lib/report-intelligence/archetype-registry.ts';

const root = path.resolve('tests/fixtures/realistic-reports/48-archetypes');
const expectedStages = [
  'source','extraction','truth','signal','why','meaning',
  'recommendation','measurement','decision','work','outcome','learning','benchmark',
];

const fail = (message) => { throw new Error(message); };
const archetypes = listReportArchetypes();
if (archetypes.length !== 48) fail('Expected 48 archetypes, got ' + archetypes.length);

const files = (await fs.readdir(root))
  .filter((name) => /^\d{2}-.*\.csv$/i.test(name))
  .sort();

if (files.length !== 48) fail('Expected 48 CSV fixtures, got ' + files.length);

const seenProfiles = new Set();
const states = new Map();

for (const fileName of files) {
  const absolute = path.join(root, fileName);
  const buffer = await fs.readFile(absolute);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const [dataset] = await parseFile(arrayBuffer, fileName, 'csv');
  if (!dataset) fail('No dataset parsed: ' + fileName);
  if (dataset.rowCount !== 12) fail(fileName + ': expected 12 rows, got ' + dataset.rowCount);

  const number = Number(fileName.slice(0, 2));
  const expectedArchetype = archetypes[number - 1];
  if (!expectedArchetype) fail('Missing archetype profile #' + number);
  const result = buildUniversalReportIntelligence({
    rowCount: dataset.rowCount,
    archetypeId: expectedArchetype.id,
    sourceAnalysis: { datasets: [dataset] },
    canonicalRows: dataset.rows.map((data, index) => ({ row_number: index + 1, data })),
    sourcePath: fileName,
    sourceHash: 'sha256:fixture-' + fileName.replace(/[^a-z0-9]+/gi, '-'),
  });

  const keys = result.stages.map((item) => item.key);
  if (keys.join('|') !== expectedStages.join('|')) fail(fileName + ': universal chain stages mismatch');
  if (!result.archetype) fail(fileName + ': no archetype detected; reason=' + result.archetypeReason);
  if (result.archetype.id !== expectedArchetype.id) fail(fileName + ': archetype mismatch: expected ' + expectedArchetype.id + ' got ' + result.archetype.id);
  if (result.archetypeState !== 'SUPPORTED') fail(fileName + ': exact archetype must be SUPPORTED, got ' + result.archetypeState);
  if (!result.intelligence.recommendations.length && !result.intelligence.signals.length) fail(fileName + ': no signal/recommendation intelligence emitted');
  if (result.advisory.outcomeState !== 'INSUFFICIENT') fail(fileName + ': outcome must remain fail-closed before post-action evidence');
  const benchmark = result.stages.find((stage) => stage.key === 'benchmark');
  if (!benchmark || benchmark.status !== 'GAP_DETECTED') fail(fileName + ': benchmark must remain fail-closed without a reference');
  seenProfiles.add(result.archetype.id);
  states.set(fileName, result.archetype.id + '|' + result.archetypeState + '|' + result.confidence);
}

if (seenProfiles.size < 40) fail('Too few distinct archetypes exercised: ' + seenProfiles.size);

console.log('UNIVERSAL_INTELLIGENCE_48_PASS files=' + files.length + ' distinctArchetypes=' + seenProfiles.size);
for (const [fileName, summary] of states) console.log(fileName + ' => ' + summary);
