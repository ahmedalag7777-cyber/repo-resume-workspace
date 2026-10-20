import fs from 'node:fs';

const root = process.cwd();
const commitPath = `${root}/src/lib/import/canonical-commit.ts`;
const migrationPath = `${root}/supabase/migrations/20260916152400_canonical_import_durable_commit_contract.sql`;

const commit = fs.readFileSync(commitPath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');

const requiredCommitMarkers = [
  "canonicalizeRow(entityType",
  "rows.forEach((row) => assertCanonicalBoundary(row, companyId));",
  "p_rows: payload",
  "p_source_hash: sourceHash",
  "p_null_policy: 'preserve'",
  "const result = data as { committed?: unknown; ids?: unknown; idempotent_replay?: unknown } | null;",
];
for (const marker of requiredCommitMarkers) {
  if (!commit.includes(marker)) throw new Error(`IMPORT_SOURCE_PRESERVATION_MISSING:${marker}`);
}

const requiredMigrationMarkers = [
  "CREATE TABLE IF NOT EXISTS public.canonical_import_commits",
  "canonical_import_commits_company_entity_hash_key",
  "CREATE FUNCTION public.import_commit_batch(",
  "public.current_company_id()",
  "p_source_hash",
  "committed_ids",
  "idempotent_replay",
];
for (const marker of requiredMigrationMarkers) {
  if (!migration.includes(marker)) throw new Error(`IMPORT_SOURCE_LINEAGE_RUNTIME_CONTRACT_MISSING:${marker}`);
}

console.log('IMPORT SOURCE FIELD PRESERVATION CONTRACT: PASS');
