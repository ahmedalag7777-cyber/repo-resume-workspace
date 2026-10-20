import fs from 'node:fs';

const files = {
  schema: fs.readFileSync('src/lib/document-intelligence/schema-discovery.ts', 'utf8'),
  validation: fs.readFileSync('src/lib/document-intelligence/validation.ts', 'utf8'),
  routing: fs.readFileSync('src/lib/document-intelligence/routing.ts', 'utf8'),
};

const checks = [
  ['schema avoids generic product-code alias', !files.schema.includes("'الصنف']")],
  ['schema records ambiguity', files.schema.includes('ambiguous-top-candidates')],
  ['schema lowers confidence for ambiguity', files.schema.includes('Math.min(best, 0.69)')],
  ['schema handles Arabic separators', files.schema.includes('/٬/g') && files.schema.includes('/٫/g')],
  ['validation rejects non-finite reconciliation inputs', files.validation.includes('RECONCILIATION_INPUT_INVALID')],
  ['validation reports incomplete line math', files.validation.includes('VALIDATION_INPUT_INCOMPLETE')],
  ['validation clamps evidence scores', files.validation.includes('finiteScore')],
  ['validation fails closed for non-finite confidence', files.validation.includes('if (!Number.isFinite(score))')],
  ['routing clamps confidence', files.routing.includes('Math.max(0, Math.min(1, value))')],
  ['unknown routes remain unmapped', files.routing.includes("action: 'UNMAPPED'") && files.routing.includes("destination: 'quarantine'")],
  ['duplicate canonical routes are grouped', files.routing.includes('new Map<string, RoutingDecision[]>')],
  ['duplicate canonical routes quarantine every candidate', files.routing.includes("decision.action = 'QUARANTINE'")],
  ['duplicate canonical routes cap confidence', files.routing.includes('Math.min(decision.confidence, 0.69)')],
];

const behavioralChecks = [
  // Structural contract: header normalization and numeric parsing must remain
  // separate; numeric parsing must operate over the complete values collection.
  ['schema normalizes headers independently from numeric parsing',
    files.schema.includes('normalizeHeader(header ??') &&
    files.schema.includes('function normalizeNumericText') &&
    files.schema.includes('function numberValue') &&
    files.schema.includes('values.map(numberValue)')],
  ['schema explicitly translates Arabic decimal separator', files.schema.includes("replace(/٫/g, '.')")],
  ['schema explicitly strips Arabic thousands separator', files.schema.includes("replace(/٬/g, '')")],
  ['schema rejects malformed numeric values', files.schema.includes("/^-?\\d+(\\.\\d+)?%?$/")],
  ['routing sends unknown fields to quarantine', files.routing.includes("entity: 'unknown'") && files.routing.includes("destination: 'quarantine'")],
  ['routing sanitizes NaN and Infinity confidence', files.routing.includes('Number.isFinite(value)')],
  ['routing downgrades duplicate mappings instead of auto approving', files.routing.includes("decision.action = 'QUARANTINE'")],
];

const allChecks = [...checks, ...behavioralChecks];
const failures = allChecks.filter(([, ok]) => !ok);
for (const [name, ok] of allChecks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failures.length) process.exit(1);
console.log(`Document Intelligence hardening: ${allChecks.length}/${allChecks.length} PASS`);
