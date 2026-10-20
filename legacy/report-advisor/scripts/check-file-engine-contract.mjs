import fs from 'node:fs';

const files = {
  normalizer: fs.readFileSync('src/lib/file-engine/normalizer.ts', 'utf8'),
  types: fs.readFileSync('src/lib/file-engine/types.ts', 'utf8'),
  synonyms: fs.readFileSync('src/lib/file-engine/synonyms.ts', 'utf8'),
  adapters: fs.readFileSync('src/lib/file-engine/adapters.ts', 'utf8'),
  dataTypes: fs.readFileSync('src/lib/file-engine/data-types.ts', 'utf8'),
};

const required = [
  ['normalizer', 'export function normalizeArabicDigits'],
  ['normalizer', 'export function normalizeHeader'],
  ['normalizer', 'export function parseNumber'],
  ['normalizer', 'export function parseDate'],
  ['synonyms', 'BUILTIN_SYNONYMS'],
  ['synonyms', 'export async function mapColumns'],
  ['adapters', 'const mappings = await mapColumns(columns)'],
  ['adapters', 'mappingEvidence:'],
  ['dataTypes', 'export function detectColumnDataType'],
  ['types', 'interface MappingEvidence'],
  ['types', 'requiresReview?: boolean'],
  ['adapters', 'PDF_OCR_MAX_PAGES = 120'],
  ['adapters', 'PDF_OCR_MAX_DIMENSION = 2200'],
  ['adapters', "parseScannedPdfWithOcr(pdf, fileName)"],
  ['adapters', "async function buildTextDataset("],
  ['adapters', "return buildTextDataset(pages.join('\\n\\n'), fileName, 'pdf-ocr', warning, minimumConfidence)"],
  ['adapters', 'confidenceFloor?: number'],
  ['adapters', 'PDF_OCR_PAGE_LIMIT_EXCEEDED'],
  ['adapters', 'PDF_SCANNED_OCR_EMPTY'],
];

for (const [file, token] of required) {
  if (!files[file].includes(token)) throw new Error(`File-engine contract missing: ${file} -> ${token}`);
}

if (!files.adapters.includes('Math.min(dataset.qualityScore, Math.round(confidenceFloor))')) throw new Error('OCR confidence floor propagation is missing');
if (/from ['\"]\.\.\/supabase['\"]/.test(files.synonyms)) throw new Error('File-engine synonyms must not import the browser-only Supabase client at module load time');
if (/console\.log\(/.test(files.adapters)) throw new Error('File-engine adapter must not contain debug logging');
if (!files.normalizer.includes("replace(/[\\u064B-\\u065F\\u0670]/g, '')")) throw new Error('Arabic diacritic normalization is missing');
if (!files.normalizer.includes("replace(/[٬]/g, ',')")) throw new Error('Arabic thousands separator normalization is missing');
if (!files.normalizer.includes("replace(/[٫]/g, '.')")) throw new Error('Arabic decimal separator normalization is missing');

console.log('File-engine architecture contract: PASS');
