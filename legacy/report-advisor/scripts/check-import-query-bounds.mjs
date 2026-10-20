import { readFileSync } from 'node:fs';

const source = readFileSync('src/lib/queries.ts', 'utf8');
const start = source.indexOf('export async function fetchImportRecords');
const end = source.indexOf('export async function markAlertRead', start);

if (start < 0 || end < 0) throw new Error('fetchImportRecords boundary not found');
const fn = source.slice(start, end);
if (!fn.includes('limit = MAX_IMPORT_RECORD_ROWS')) throw new Error('import query limit default missing');
if (!/Number\.isInteger\(limit\)[\s\S]*limit > MAX_IMPORT_RECORD_ROWS/.test(fn)) throw new Error('import query limit must fail closed above MAX_IMPORT_RECORD_ROWS');
if (!/select\([^)]*result_summary/.test(fn)) throw new Error('import history projection missing');
const importRead = fn.match(/\.from\('import_jobs'\)[^;]+;/)?.[0] ?? '';
if (importRead && !/\.range\s*\(\s*0\s*,\s*limit\s*-\s*1\s*\)/.test(importRead)) throw new Error('import history query must use the validated limit');
console.log('Import query bounds regression: PASS');

const compat = readFileSync('src/lib/queries-compat.ts', 'utf8');
const compatStart = compat.indexOf('export async function fetchImportRecords');
if (compatStart < 0) throw new Error('compat fetchImportRecords boundary not found');
const compatFn = compat.slice(compatStart, compat.indexOf('export interface PurchaseSummary', compatStart));
const compatIsForwardingOnly = compatFn.includes('canonicalFetchImportRecords(limit, focusJobId)');
if (compatIsForwardingOnly) {
  if (!compatFn.includes('limit = 500')) throw new Error('compat forwarding wrapper limit default missing');
} else {
  if (!compatFn.includes('limit = 500')) throw new Error('compat import query limit default missing');
  if (!/Number\.isInteger\(limit\)[\s\S]*limit > 500/.test(compatFn)) throw new Error('compat import query limit must fail closed above 500');
  if (!/\.range\s*\(\s*0\s*,\s*limit\s*-\s*1\s*\)/.test(compatFn)) throw new Error('compat import query must use the validated limit');
}
console.log(compatIsForwardingOnly
  ? 'Compatibility import query bounds regression: PASS (forwarding-only boundary delegates validation and bounded read to canonical queries.ts)'
  : 'Compatibility import query bounds regression: PASS');