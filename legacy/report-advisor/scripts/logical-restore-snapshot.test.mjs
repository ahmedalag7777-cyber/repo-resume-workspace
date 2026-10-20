import assert from 'node:assert/strict';
import { buildExportedSnapshotSql, buildSnapshotBoundQuery, parseExportedSnapshotOutput } from '../src/server/logical-restore-snapshot.mjs';

const exported = parseExportedSnapshotOutput(
  'BEGIN\n2026-10-12T00:38:45.123Z|00000003-000001A0-1\n',
);
assert.equal(exported.exportedAt, '2026-10-12T00:38:45.123Z');
assert.equal(exported.snapshotId, '00000003-000001A0-1');

assert.throws(() => parseExportedSnapshotOutput('BEGIN\n(no snapshot)\n'), /logical_snapshot_export_not_created/);
assert.throws(() => buildSnapshotBoundQuery('invalid snapshot', 'select 1'), /logical_snapshot_id_invalid/);
assert.throws(() => buildSnapshotBoundQuery('00000003-000001A0-1', '  '), /logical_snapshot_query_empty/);

const exportSql = buildExportedSnapshotSql();
assert.match(exportSql, /^BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;/);
assert.match(exportSql, /pg_export_snapshot\(\)/);
assert.match(exportSql, /YYYY-MM-DD/);

const query = buildSnapshotBoundQuery(
  '00000003-000001A0-1',
  'CREATE TEMP TABLE counts AS SELECT count(*) AS rows FROM public.products;',
);
const statements = query.trim().split(/;\s*/).filter(Boolean);
assert.equal(statements[0], 'BEGIN ISOLATION LEVEL REPEATABLE READ');
assert.equal(statements[1], "SET TRANSACTION SNAPSHOT '00000003-000001A0-1'");
assert.match(statements[2], /^CREATE TEMP TABLE counts/);
assert.equal(statements.at(-1), 'COMMIT');
console.log('Logical restore shared-snapshot contract: PASS');
