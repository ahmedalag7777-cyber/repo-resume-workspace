import { decideIncrementalImport, reconcileRows } from '../src/lib/import-pipeline/incremental-import-ledger.ts';

const unchanged = decideIncrementalImport({ sourceKey:'folder:a', contentHash:'hash', sizeBytes:10, modifiedAt:'2026-08-25T00:00:00Z' }, { sourceKey:'folder:a', contentHash:'hash', sizeBytes:99, modifiedAt:'2026-08-26T00:00:00Z' });
if (unchanged.action !== 'skip_unchanged') throw new Error('Identical content hash must skip unchanged input.');

const weak = decideIncrementalImport({ sourceKey:'folder:a', contentHash:'', sizeBytes:10, modifiedAt:'2026-08-25T00:00:00Z' }, { sourceKey:'folder:a', contentHash:'', sizeBytes:10, modifiedAt:'2026-08-25T00:00:00Z' });
if (weak.action !== 'process_changed') throw new Error('Weak fingerprints must fail closed into changed processing.');

let duplicateRejected = false;
try { reconcileRows([{ stableKey:'SKU-1', rowHash:'a' }, { stableKey:'SKU-1', rowHash:'b' }], []); } catch (error) { duplicateRejected = String(error).includes('IMPORT_RECONCILIATION_DUPLICATE_KEYS'); }
if (!duplicateRejected) throw new Error('Duplicate stable row keys must be rejected before reconciliation.');

const result = reconcileRows([{ stableKey:'SKU-1', rowHash:'b' }], [{ stableKey:'SKU-1', rowHash:'a' }, { stableKey:'SKU-2', rowHash:'x' }]);
if (result.changed.length !== 1 || result.deleted.length !== 1 || result.unchanged.length !== 0) throw new Error('Changed/deleted reconciliation result is incorrect.');

console.log('incremental-import-ledger: PASS');
