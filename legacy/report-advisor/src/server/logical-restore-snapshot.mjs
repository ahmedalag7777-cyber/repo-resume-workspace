const SNAPSHOT_ID = /^[0-9A-F]+-[0-9A-F]+-[0-9A-F]+$/i;
const SNAPSHOT_LINE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\|([0-9A-F]+-[0-9A-F]+-[0-9A-F]+)$/i;

export function parseExportedSnapshotOutput(raw) {
  for (const line of String(raw ?? '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
    const match = line.match(SNAPSHOT_LINE);
    if (!match) continue;
    const exportedAt = match[1];
    const snapshotId = match[2];
    if (!Number.isFinite(Date.parse(exportedAt)) || !SNAPSHOT_ID.test(snapshotId)) continue;
    return { exportedAt, snapshotId };
  }
  throw new Error('logical_snapshot_export_not_created');
}

export function buildSnapshotBoundQuery(snapshotId, sql) {
  const snapshot = String(snapshotId ?? '').trim();
  const statement = String(sql ?? '').trim();
  if (!SNAPSHOT_ID.test(snapshot)) throw new Error('logical_snapshot_id_invalid');
  if (!statement) throw new Error('logical_snapshot_query_empty');
  return [
    'BEGIN ISOLATION LEVEL REPEATABLE READ;',
    "SET TRANSACTION SNAPSHOT '" + snapshot + "';",
    statement,
    'COMMIT;',
    '',
  ].join('\n');
}

export function buildExportedSnapshotSql() {
  return [
    'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;',
    "SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') || '|' || pg_export_snapshot();",
    '',
  ].join('\n');
}
