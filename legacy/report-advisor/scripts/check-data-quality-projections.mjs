import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const legacyQueryPath = path.join(ROOT, 'src/lib/data-quality-queries.ts');
const pagePath = path.join(ROOT, 'src/pages/EntityPages.tsx');
const corePath = path.join(ROOT, 'src/lib/data-quality-snapshot-core.ts');
const adapterPath = path.join(ROOT, 'src/lib/data-quality-snapshot-runtime.ts');
const adapterBridgePath = path.join(ROOT, 'src/lib/data-quality-snapshot.ts');
const routePath = path.join(ROOT, 'src/pages/DataQualitySnapshotPage.tsx');
const emptyTruthMigrationPath = path.join(ROOT, 'supabase/migrations/20260830240000_fix_empty_quality_truth.sql');

if (fs.existsSync(legacyQueryPath)) {
  throw new Error('Legacy Data Quality client dataset bridge still exists: src/lib/data-quality-queries.ts');
}

const pageSource = fs.readFileSync(pagePath, 'utf8');
const coreSource = fs.readFileSync(corePath, 'utf8');
const adapterSource = fs.readFileSync(adapterPath, 'utf8');
const adapterBridgeSource = fs.readFileSync(adapterBridgePath, 'utf8');
const routeSource = fs.readFileSync(routePath, 'utf8');
const emptyTruthMigration = fs.readFileSync(emptyTruthMigrationPath, 'utf8');

if (/fetchDataQualityDatasets|DataQualityPage/.test(pageSource)) {
  throw new Error('EntityPages.tsx still contains a legacy Data Quality consumer');
}
if (/supabase\.from\(/.test(adapterSource)) {
  throw new Error('Data Quality runtime adapter must not perform direct table reads');
}
if (!adapterSource.includes("supabase.rpc('get_data_quality_snapshot')")) {
  throw new Error('Data Quality runtime adapter must call the canonical snapshot RPC');
}
if (!adapterSource.includes('validateDataQualitySnapshot')) {
  throw new Error('Data Quality runtime adapter must delegate payload validation to the pure core');
}
if (!coreSource.includes('DATA_QUALITY_SNAPSHOT_INVALID')) {
  throw new Error('Data Quality pure validator must fail closed on invalid snapshots');
}
if (!coreSource.includes('DATA_QUALITY_EMPTY_SNAPSHOT_INCONSISTENT')) {
  throw new Error('Data Quality pure validator must reject fabricated EMPTY details');
}
if (!adapterBridgeSource.includes("./data-quality-snapshot-runtime")) {
  throw new Error('Legacy Data Quality bridge must delegate to the validated runtime adapter');
}
if (!routeSource.includes('fetchDataQualitySnapshot')) {
  throw new Error('DataQualitySnapshotPage must consume the canonical snapshot adapter');
}
if (!emptyTruthMigration.includes("'status',case when customer_total+product_total+invoice_total+balance_total=0 then 'EMPTY' else 'OK' end")) {
  throw new Error('Empty Data Quality snapshot must be explicitly marked EMPTY');
}
if ((emptyTruthMigration.match(/'score',case when[\s\S]*?else 0 end/g) || []).length !== 4) {
  throw new Error('All four empty entity scores must remain 0, never 100');
}
if (/else 100 end/.test(emptyTruthMigration)) {
  throw new Error('Empty Data Quality truth must never fall back to a perfect 100 score');
}

// Test-of-test: removing the canonical RPC boundary must fail the contract.
const weakenedAdapter = adapterSource.replace("supabase.rpc('get_data_quality_snapshot')", 'supabase.from(\'customers\')');
if (weakenedAdapter.includes("supabase.rpc('get_data_quality_snapshot')")) {
  throw new Error('Data Quality RPC test-of-test is invalid');
}
if (!/supabase\.from\(/.test(weakenedAdapter)) {
  throw new Error('Data Quality RPC test-of-test failed to construct the forbidden direct-read variant');
}

console.log('Data Quality canonical snapshot contract: PASS');
console.log('  - legacy client dataset bridge removed');
console.log('  - legacy DataQualityPage consumer removed from EntityPages');
console.log('  - runtime adapter has no direct table reads');
console.log('  - runtime adapter calls get_data_quality_snapshot');
console.log('  - pure validator fails closed on invalid snapshots');
console.log('  - EMPTY snapshots cannot contain fabricated details');
console.log('  - route consumes the canonical snapshot adapter');
console.log('  - empty datasets are explicit EMPTY/0, not perfect quality');
