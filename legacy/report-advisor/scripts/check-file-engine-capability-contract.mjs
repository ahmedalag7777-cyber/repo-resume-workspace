import fs from 'node:fs';

const adapters = fs.readFileSync('src/lib/file-engine/adapters.ts', 'utf8');
const types = fs.readFileSync('src/lib/file-engine/types.ts', 'utf8');

const requiredExports = ['parseSpreadsheet', 'parseCSV', 'parseJSON', 'parseJSONL', 'parseFile'];
for (const name of requiredExports) {
  if (!new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).test(adapters)) {
    throw new Error(`Missing canonical file-engine adapter: ${name}`);
  }
}

if (!/case 'csv':\s*return parseCSV\(buffer, fileName\);/.test(adapters)) {
  throw new Error('CSV must use automatic delimiter detection in the canonical parseFile adapter.');
}

if (!/function detectDelimiter\(line: string\)/.test(adapters)) {
  throw new Error('CSV delimiter detection is missing.');
}

if (!/export type FileFormat/.test(types) || !/export interface FileDetectionResult/.test(types) || !/export interface Dataset/.test(types)) {
  throw new Error('File-engine canonical types are incomplete.');
}

const supportedMatch = types.match(/SUPPORTED_FORMATS[\s\S]*?= \[([\s\S]*?)\];/m);
const supported = supportedMatch?.[1] ?? '';
if (!supportedMatch) {
  throw new Error('SUPPORTED_FORMATS declaration is missing or malformed.');
}

const declaredFormats = [...supported.matchAll(/[\'\"]([^\'\"]+)[\'\"]/g)].map((match) => match[1]);
const requiredProductionFormats = ['xlsx', 'csv', 'tsv', 'json', 'jsonl'];
for (const format of requiredProductionFormats) {
  if (!declaredFormats.includes(format)) {
    throw new Error(`Required production format is missing from SUPPORTED_FORMATS: ${format}`);
  }
}

// Every declared format must have an explicit parseFile disposition. This prevents
// detector/UI drift where a format is advertised but falls through to a generic error.
const parseFileStart = adapters.indexOf('export async function parseFile(');
const parseFileBody = parseFileStart >= 0 ? adapters.slice(parseFileStart) : '';
for (const format of declaredFormats) {
  if (!new RegExp(`case [\'\"]${format}[\'\"]\\s*:`).test(parseFileBody)) {
    throw new Error(`Declared format has no explicit parseFile disposition: ${format}`);
  }
}

console.log(`file-engine capability contract: PASS (${declaredFormats.length} declared formats explicitly dispatched)`);

if (!adapters.includes('PDF_SCANNED_IMAGE_ONLY_SERVER_AUTHORITY_UNAVAILABLE')) {
  throw new Error('Scanned PDF server authority must fail closed with an explicit runtime capability boundary');
}
