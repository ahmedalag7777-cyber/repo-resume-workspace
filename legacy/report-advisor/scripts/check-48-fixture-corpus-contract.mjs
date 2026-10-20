import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../tests/fixtures/realistic-reports/48-archetypes/', import.meta.url);
const directory = root instanceof URL ? fileURLToPath(root) : root;

function fail(message) {
  throw new Error('48_FIXTURE_CORPUS:' + message);
}

const fixturePath = fileURLToPath(root);
if (!fs.existsSync(fixturePath)) fail('DIRECTORY_MISSING');

const manifestPath = path.join(fixturePath, 'manifest.json');
if (!fs.existsSync(manifestPath)) fail('MANIFEST_MISSING');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.fixtureType !== 'synthetic-realistic') fail('FIXTURE_TYPE_MISMATCH');
if (manifest.catalogId !== 'report-intelligence.48') fail('CATALOG_ID_MISMATCH');
if (manifest.count !== 48) fail('MANIFEST_COUNT_MISMATCH');

const csvFiles = fs.readdirSync(fixturePath)
  .filter((name) => /^\d{2}-.+\.csv$/.test(name))
  .sort();

if (csvFiles.length !== 48) fail('CSV_COUNT_' + csvFiles.length);

const manifestPaths = new Set((manifest.files ?? []).map((item) => String(item.path)));
if (manifestPaths.size !== 48) fail('MANIFEST_FILE_COUNT_' + manifestPaths.size);

for (const name of csvFiles) {
  const absolute = path.join(fixturePath, name);
  const content = fs.readFileSync(absolute, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.trimEnd().split(/\r?\n/);
  if (lines.length !== 13) fail(name + ':EXPECTED_12_DATA_ROWS');
  const header = lines[0].split(',');
  if (header.length < 5) fail(name + ':HEADER_TOO_SMALL');
  if (new Set(header).size !== header.length) fail(name + ':DUPLICATE_HEADER');
  const record = (manifest.files ?? []).find((item) => item.path.endsWith('/' + name));
  if (!record) fail(name + ':MANIFEST_ENTRY_MISSING');
  if (Number(record.rows) !== 12) fail(name + ':MANIFEST_ROW_COUNT_MISMATCH');
  if (record.archetypeId == null || !String(record.archetypeId).trim()) fail(name + ':ARCHETYPE_ID_MISSING');
}

console.log(JSON.stringify({
  status: 'PASS',
  fixtureType: manifest.fixtureType,
  catalogId: manifest.catalogId,
  csvCount: csvFiles.length,
  rowsPerFile: 12,
  realSourceProof: 'SEPARATE_GATE',
}));
