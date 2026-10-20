#!/usr/bin/env node
/** Phase F live resilience probes. Fail-closed; never synthesize PASS. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import dns from 'node:dns/promises';
import { retryTransientPostgresConnection } from '../src/server/resilience-db-retry.mjs';
import { buildExportedSnapshotSql, buildSnapshotBoundQuery, parseExportedSnapshotOutput } from '../src/server/logical-restore-snapshot.mjs';

const backupMode = (process.env.RESILIENCE_BACKUP_MODE || 'logical').trim().toLowerCase() || 'logical';
// Use the Docker Official Images mirror in Amazon ECR Public to avoid Docker Hub's
// anonymous pull-rate limit in the fail-closed backup/restore certification probe.
const postgresClientImage = (process.env.RESILIENCE_POSTGRES_CLIENT_IMAGE || 'public.ecr.aws/docker/library/postgres:17').trim();
if (!postgresClientImage) throw new Error('RESILIENCE_POSTGRES_CLIENT_IMAGE_EMPTY');
if (!['managed', 'logical'].includes(backupMode)) throw new Error(`invalid_resilience_backup_mode:${backupMode}`);

const baseRequired = [
  'EXACT_HEAD',
  'RESILIENCE_TARGET_ENV',
  'RESILIENCE_OPERATIONAL_TOKEN',
  'RESILIENCE_CANARY_AUTH_TOKEN',
  'RESILIENCE_HEALTH_URL',
  'RESILIENCE_CANARY_URL',
  'RESILIENCE_ROLLBACK_DRILL_URL',
];
const required = [
  ...baseRequired,
  ...(backupMode === 'managed'
    ? ['RESILIENCE_BACKUP_VERIFY_URL']
    : ['RESILIENCE_LOGICAL_SOURCE_DB_URL', 'RESILIENCE_MAX_RPO_SECONDS']),
];

const reportDir = path.join(process.cwd(), 'artifacts', 'phase-f');
const reportPath = path.join(reportDir, 'phase-f-readiness.json');
const exactHead = process.env.EXACT_HEAD || 'UNKNOWN';
const governanceHead = process.env.GOVERNANCE_HEAD?.trim() || exactHead;
const target = process.env.RESILIENCE_TARGET_ENV?.trim() || null;
const missing = required.filter(name => !process.env[name]?.trim());

fs.mkdirSync(reportDir, { recursive: true });

function writeReport(status, reason, extra = {}) {
  const report = {
    exactHead,
    governanceHead,
    targetEnv: target,
    status,
    reason,
    required,
    missing,
    checkedAt: new Date().toISOString(),
    ...extra,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`PHASE_F_STATUS=${status}`);
  console.log(`PHASE_F_REPORT=${reportPath}`);
  console.log(`PHASE_F_REASON=${reason}`);
}

if (missing.length) {
  writeReport(
    'BLOCKED EXTERNAL',
    'Required live resilience secrets/targets are not provisioned in the execution environment.',
    { blockedDependency: missing },
  );
  console.error('FAIL-CLOSED: missing Phase F live configuration:');
  for (const name of missing) console.error(`- ${name}`);
  process.exit(2);
}

if (/^(prod|production)$/i.test(target) && process.env.RESILIENCE_ALLOW_PRODUCTION !== 'true') {
  writeReport(
    'NOT READY',
    'Production target requires explicit RESILIENCE_ALLOW_PRODUCTION=true.',
    { policyViolation: 'RESILIENCE_ALLOW_PRODUCTION' },
  );
  console.error('FAIL-CLOSED: production requires explicit RESILIENCE_ALLOW_PRODUCTION=true');
  process.exit(3);
}

const checks = [];

function runCommand(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
      ...options,
    }).trim();
  } catch (error) {
    const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : '';
    const stdout = typeof error?.stdout === 'string' ? error.stdout.trim() : '';
    const diagnostics = [stderr, stdout].filter(Boolean).join('\n');
    const boundedDiagnostics = diagnostics.length > 12000
      ? `HEAD:\n${diagnostics.slice(0, 3000)}\n...TRUNCATED...\nTAIL:\n${diagnostics.slice(-9000)}`
      : diagnostics;
    const exitCode = Number.isInteger(error?.status) ? error.status : null;
    const signal = typeof error?.signal === 'string' ? error.signal : null;
    const code = typeof error?.code === 'string' ? error.code : null;
    throw new Error(`${command}_failed:exit_code=${exitCode ?? 'unknown'}:signal=${signal ?? 'none'}:code=${code ?? 'none'}:${boundedDiagnostics || error?.message || String(error)}`);
  }
}

async function preferIpv4Host(databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (!parsed.hostname || /^\d+(?:\.\d+){3}$/.test(parsed.hostname)) return databaseUrl;

  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || '';
  const region = process.env.RESILIENCE_SUPABASE_REGION?.trim() || 'ap-southeast-2';
  const directMatch = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  const directPort = parsed.port || '5432';

  try {
    const answers = await dns.lookup(parsed.hostname, { family: 4, all: true, verbatim: false });
    const ipv4 = answers.find(answer => answer.family === 4)?.address;
    if (ipv4) {
      parsed.searchParams.set('hostaddr', ipv4);
      return parsed.toString();
    }
  } catch {
    // IPv6-only/direct DNS is expected for Supabase projects on IPv4-only CI.
    // Continue to the project-scoped shared pooler fallback instead of returning
    // the unusable direct endpoint.
  }

  if (projectRef && directMatch && directMatch[1] === projectRef && directPort === '5432') {
    parsed.hostname = `aws-0-${region}.pooler.supabase.com`;
    parsed.username = `postgres.${projectRef}`;
    parsed.searchParams.delete('hostaddr');
    try {
      const poolerAnswers = await dns.lookup(parsed.hostname, { family: 4, all: true, verbatim: false });
      const poolerIpv4 = poolerAnswers.find(answer => answer.family === 4)?.address;
      if (poolerIpv4) parsed.searchParams.set('hostaddr', poolerIpv4);
      return parsed.toString();
    } catch {
      return databaseUrl;
    }
  }

  return databaseUrl;
}

function toTransactionPooler(databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (parsed.hostname.endsWith('.pooler.supabase.com') && (!parsed.port || parsed.port === '5432')) {
    parsed.port = '6543';
  }
  return parsed.toString();
}

function runDockerPsql(databaseUrl, sql) {
  const args = [
    'run', '--rm', '--network', 'host',
    '-e', 'PGURI=' + databaseUrl,
    '-e', 'QUERY=' + sql,
    postgresClientImage,
    'sh', '-lc',
    'psql "$PGURI" -v ON_ERROR_STOP=1 -At -c "SET statement_timeout = 0" -c "$QUERY"',
  ];
  return retryTransientPostgresConnection(
    () => runCommand('docker', args),
    { label: 'psql', maxAttempts: 3 },
  );
}

function runDockerPsqlWithSnapshot(databaseUrl, snapshotId, sql) {
  const query = buildSnapshotBoundQuery(snapshotId, sql);
  const args = [
    'run', '--rm', '--network', 'host',
    '-e', 'PGURI=' + databaseUrl,
    '-e', 'QUERY=' + query,
    postgresClientImage,
    'sh', '-lc',
    'psql "$PGURI" -v ON_ERROR_STOP=1 -At -c "SET statement_timeout = 0" -c "$QUERY"',
  ];
  return retryTransientPostgresConnection(
    () => runCommand('docker', args),
    { label: 'psql-exported-snapshot', maxAttempts: 3 },
  );
}

function startExportedSnapshot(databaseUrl) {
  const args = [
    'run', '--rm', '-i', '--network', 'host',
    '-e', 'PGURI=' + databaseUrl,
    postgresClientImage,
    'sh', '-lc',
    'psql "$PGURI" -v ON_ERROR_STOP=1 -qAt',
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let exited = false;
    let closeResult = null;
    let startTimer = null;

    const closePromise = new Promise((resolveClose) => {
      child.once('close', (code, signal) => {
        exited = true;
        closeResult = { code, signal };
        resolveClose(closeResult);
      });
    });

    const failStart = (error) => {
      if (settled) return;
      settled = true;
      if (startTimer) clearTimeout(startTimer);
      try { child.kill('SIGTERM'); } catch {}
      reject(error);
    };

    startTimer = setTimeout(() => {
      failStart(new Error('logical_snapshot_export_timeout:' + stderr.slice(-1200)));
    }, 30000);
    startTimer.unref?.();

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (settled || !stdout.includes('|')) return;
      try {
        const snapshot = parseExportedSnapshotOutput(stdout);
        settled = true;
        if (startTimer) clearTimeout(startTimer);
        resolve({
          ...snapshot,
          close: async () => {
            if (!exited) {
              const killTimer = setTimeout(() => {
                if (!exited) child.kill('SIGTERM');
              }, 5000);
              killTimer.unref?.();
              try {
                child.stdin.end('ROLLBACK;\n\\q\n');
              } catch {}
              await closePromise;
              clearTimeout(killTimer);
            }
            if (closeResult?.code !== 0) {
              throw new Error('logical_snapshot_export_session_close_failed:' + (closeResult?.code ?? 'unknown') + ':' + stderr.slice(-1200));
            }
          },
        });
      } catch {
        // Wait for a complete result line; any terminal failure includes bounded diagnostics.
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-8000);
    });
    child.once('error', (error) => failStart(new Error('logical_snapshot_export_process_failed:' + error.message)));
    child.once('close', (code, signal) => {
      if (!settled) {
        failStart(new Error('logical_snapshot_export_failed:exit_code=' + (code ?? 'unknown') + ':signal=' + (signal ?? 'none') + ':' + (stderr || stdout).slice(-2000)));
      }
    });
    child.stdin.once('error', (error) => failStart(new Error('logical_snapshot_export_stdin_failed:' + error.message)));
    child.stdin.write(buildExportedSnapshotSql());
  });
}

function runDockerPsqlFile(databaseUrl, filePath) {
  return runCommand('docker', [
    'run', '--rm', '--network', 'host',
    '-v', `${path.resolve(filePath)}:/tmp/phase-f-backup.sql:ro`,
    '-e', `PGURI=${databaseUrl}`,
    postgresClientImage,
    'sh', '-lc',
    'psql "$PGURI" -v ON_ERROR_STOP=1 -c "SET statement_timeout = 0" -c "ALTER TABLE public.recommendations DISABLE TRIGGER trg_source_recommendation_evidence" -f /tmp/phase-f-backup.sql -c "ALTER TABLE public.recommendations ENABLE TRIGGER trg_source_recommendation_evidence"',
  ]);
}

function runDockerPsqlFileRaw(databaseUrl, filePath) {
  return runCommand('docker', [
    'run', '--rm', '--network', 'host',
    '-v', `${path.resolve(filePath)}:/tmp/phase-f-auth-user-stubs.sql:ro`,
    '-e', `PGURI=${databaseUrl}`,
    postgresClientImage,
    'sh', '-lc',
    'psql "$PGURI" -v ON_ERROR_STOP=1 -c "SET statement_timeout = 0" -f /tmp/phase-f-auth-user-stubs.sql',
  ]);
}

function parseAuthUserIds(raw) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const values = raw.split(/\r?\n/).map(value => value.trim()).filter(value => uuidPattern.test(value));
  return [...new Set(values.map(value => value.toLowerCase()))].sort();
}

function buildAuthUserStubSql(userIds) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ids = [...new Set(userIds.map(value => String(value).trim().toLowerCase()))].sort();
  if (ids.some(id => !uuidPattern.test(id))) {
    throw new Error('logical_restore_auth_user_id_invalid');
  }
  if (!ids.length) return 'BEGIN;\nCOMMIT;\n';
  const values = ids.map(id => "  ('" + id + "'::uuid)").join(',\n');
  // Identity-only placeholders for the ephemeral restore target; never copy auth credentials or metadata.
  return [
    'BEGIN;',
    'SET LOCAL session_replication_role = replica;',
    'INSERT INTO auth.users (id)',
    'VALUES',
    values,
    'ON CONFLICT (id) DO NOTHING;',
    'COMMIT;',
    '',
  ].join('\n');
}

function verifyRestoredRecommendationAuthority(databaseUrl) {
  const sql = `
do $$
declare
  invalid_count bigint;
begin
  select count(*) into invalid_count
  from public.recommendations r
  left join public.report_evidence_passports p
    on p.company_id = r.company_id
   and p.evidence_snapshot_id = nullif(r.evidence->>'evidenceSnapshotId','')::uuid
   and p.report_execution_job_id = nullif(r.evidence->>'reportExecutionJobId','')::uuid
   and p.source_hash = nullif(trim(r.evidence->>'sourceHash'),'')
   and p.verification_status = 'VERIFIED'
   and p.decision_readiness = 'READY'
  where lower(coalesce(r.category,'')) = 'source-intelligence'
    and p.id is null;
  if invalid_count <> 0 then
    raise exception 'logical_restore_source_recommendation_integrity_failed:%', invalid_count;
  end if;
end $$;`;
  runDockerPsql(databaseUrl, sql);
  return true;
}

function runDockerPgDump(databaseUrl, outputPath, snapshotId) {
  const outputDir = path.dirname(path.resolve(outputPath));
  const outputName = path.basename(outputPath);
  const containerDir = '/tmp/phase-f-output';
  const containerPath = containerDir + '/' + outputName;
  // A public-only dump cannot restore auth.users. Exclude volatile operational
  // rows that depend on Supabase-managed Auth instead of counting them as parity
  // data and then accidentally writing them into the restore target.
  const volatileExcludeArgs = [...VOLATILE_RESTORE_TABLES]
    .map((tableName) => `--exclude-table-data=${tableName}`)
    .join(' ');
  const args = [
    'run', '--rm', '--network', 'host',
    '-v', outputDir + ':' + containerDir,
    '-e', 'PGURI=' + databaseUrl,
    '-e', 'SNAPSHOT_ID=' + snapshotId,
    postgresClientImage,
    'sh', '-lc',
    `pg_dump "$PGURI" --snapshot="$SNAPSHOT_ID" --schema=public --data-only ${volatileExcludeArgs} --no-owner --no-privileges --format=plain --file=${containerPath}`,
  ];
  return retryTransientPostgresConnection(
    () => runCommand('docker', args),
    { label: 'pg_dump-exported-snapshot', maxAttempts: 3 },
  );
}

const VOLATILE_RESTORE_TABLES = new Set([
  'public.operational_health_snapshots',
  // User session/cart state and its child rows depend on auth.users/carts, which are outside
  // the public data-only dump. These rows are operational convenience state, not report/decision truth.
  'public.carts',
  'public.cart_items',
]);

function parseTableCounts(raw) {
  const result = {};
  for (const line of raw.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
    const match = line.match(/^(public\.[^|]+)\|(-?\d+)$/);
    if (!match) continue;
    const [, tableName, rowCount] = match;
    if (VOLATILE_RESTORE_TABLES.has(tableName)) continue;
    result[tableName] = Number(rowCount);
  }
  return result;
}

function stableJson(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

async function logicalBackupRestore() {
  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || '';
  const explicitSource = process.env.RESILIENCE_LOGICAL_SOURCE_DB_URL?.trim() || '';
  const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim() || '';
  const temporaryAccessToken = process.env.SUPABASE_TEMPORARY_ACCESS_TOKEN?.trim()
    || process.env.SUPABASE_MANAGEMENT_TOKEN?.trim()
    || '';
  if ((dbPassword || temporaryAccessToken) && !projectRef) {
    throw new Error('logical_backup_project_ref_not_configured');
  }
  const jitEnabled = !dbPassword && Boolean(temporaryAccessToken);
  const password = dbPassword || temporaryAccessToken;
  const querySuffix = jitEnabled ? '?options=-c%20jit%3Don' : '';
  const poolerRegion = process.env.RESILIENCE_SUPABASE_REGION?.trim() || 'ap-southeast-2';
  const derivedSource = password
    ? `postgresql://postgres.${encodeURIComponent(projectRef)}:${encodeURIComponent(password)}@aws-0-${poolerRegion}.pooler.supabase.com:5432/postgres${querySuffix}`
    : '';

  if (!explicitSource && !derivedSource) {
    throw new Error('logical_backup_source_db_url_not_configured');
  }

  const sourceCandidates = [];
  const addCandidate = (sourceUrl, mode) => {
    if (!sourceUrl || sourceCandidates.some(candidate => candidate.url === sourceUrl)) return;
    sourceCandidates.push({ url: sourceUrl, mode });
  };

  addCandidate(explicitSource, 'explicit_override');
  addCandidate(derivedSource, 'derived_project_pooler');

  if (explicitSource && projectRef) {
    try {
      const parsedExplicit = new URL(explicitSource);
      const directHost = `db.${projectRef}.supabase.co`;
      const isDirectSupabaseDb = parsedExplicit.hostname === directHost;
      if (isDirectSupabaseDb && parsedExplicit.password) {
        const fallback = new URL(explicitSource);
        fallback.hostname = `aws-0-${process.env.RESILIENCE_SUPABASE_REGION?.trim() || 'ap-southeast-2'}.pooler.supabase.com`;
        fallback.port = '5432';
        fallback.username = `postgres.${projectRef}`;
        fallback.pathname = '/postgres';
        addCandidate(fallback.toString(), 'explicit_to_project_pooler_fallback');
      }
    } catch {
      throw new Error('logical_backup_explicit_source_invalid_url');
    }
  }

  const probeErrors = [];
  let runnerSource = null;
  let sourceSelection = null;

  for (const candidate of sourceCandidates) {
    try {
      const resolved = await preferIpv4Host(candidate.url);
      runDockerPsql(resolved, 'select 1');
      runnerSource = resolved;
      sourceSelection = {
        mode: candidate.mode,
        candidate_count: sourceCandidates.length,
        fallback_used: candidate.mode !== 'explicit_override',
      };
      break;
    } catch (error) {
      const message = String(error);
      probeErrors.push(`${candidate.mode}: ${message.slice(-1800)}`);
    }
  }

  if (!runnerSource) {
    throw new Error(`logical_backup_source_unreachable:${probeErrors.join(' | ')}`);
  }

  const querySource = await preferIpv4Host(toTransactionPooler(runnerSource));
  const maxRpoSeconds = Number(process.env.RESILIENCE_MAX_RPO_SECONDS);
  if (!Number.isFinite(maxRpoSeconds) || maxRpoSeconds < 0) {
    throw new Error('invalid_max_rpo_seconds');
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-f-logical-'));
  const backupDir = path.join(workDir, 'dump');
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o777 });
  fs.chmodSync(backupDir, 0o777);
  const backupPath = path.join(backupDir, 'public-data.sql');

  const countSql = `create temp table _phase_f_counts(table_name text, row_count bigint) on commit drop;
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    EXECUTE format(
      'INSERT INTO _phase_f_counts(table_name, row_count) SELECT %L, count(*) FROM %I.%I',
      r.table_schema || '.' || r.table_name,
      r.table_schema,
      r.table_name
    );
  END LOOP;
END $$;
SELECT table_name || '|' || row_count::text FROM _phase_f_counts ORDER BY table_name;`;
  const authUserIdsSql = `CREATE TEMP TABLE _phase_f_auth_user_ids (id uuid PRIMARY KEY) ON COMMIT DROP;
DO $phase_f_auth_ids$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT
      child_ns.nspname AS child_schema,
      child.relname AS child_table,
      child_att.attname AS child_column
    FROM pg_constraint c
    JOIN pg_class child ON child.oid = c.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_attribute child_att ON child_att.attrelid = c.conrelid AND child_att.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = 'auth.users'::regclass
      AND child_ns.nspname = 'public'
      AND cardinality(c.conkey) = 1
      AND cardinality(c.confkey) = 1
      AND child_att.atttypid = 'uuid'::regtype
      AND (child_ns.nspname || '.' || child.relname) <> ALL (
        ARRAY['public.carts', 'public.cart_items', 'public.operational_health_snapshots']
      )
    ORDER BY child.relname, child_att.attname
  LOOP
    EXECUTE format(
      'INSERT INTO _phase_f_auth_user_ids(id) SELECT DISTINCT %I::uuid FROM %I.%I WHERE %I IS NOT NULL ON CONFLICT (id) DO NOTHING',
      fk.child_column,
      fk.child_schema,
      fk.child_table,
      fk.child_column
    );
  END LOOP;
END $phase_f_auth_ids$;
SELECT id::text FROM _phase_f_auth_user_ids ORDER BY id;`;

  let localDbUrl = null;
  let localStarted = false;
  const startedAt = Date.now();

  try {
    runCommand('supabase', ['init'], { cwd: workDir });
    fs.cpSync(
      path.join(process.cwd(), 'supabase', 'migrations'),
      path.join(workDir, 'supabase', 'migrations'),
      { recursive: true },
    );
    runCommand('supabase', ['start'], { cwd: workDir });
    localStarted = true;

    const statusEnv = runCommand('supabase', ['status', '-o', 'env'], { cwd: workDir });
    const dbLine = statusEnv.split(/\r?\n/).find(line => line.startsWith('DB_URL='));
    if (!dbLine) throw new Error('local_restore_db_url_missing');
    localDbUrl = dbLine.slice('DB_URL='.length).trim().replace(/^['"]|['"]$/g, '');

    runCommand('supabase', ['db', 'reset', '--debug', '--no-seed'], { cwd: workDir });

    const causalSchema = runDockerPsql(localDbUrl, "select coalesce(to_regclass('public.intelligence_causal_hypotheses')::text, '')");
    if (!causalSchema.includes('intelligence_causal_hypotheses')) {
      throw new Error('local_restore_schema_missing_intelligence_causal_hypotheses');
    }

    let snapshotText;
    let snapshotAt;
    let sourceCounts;
    let sourceCountsAfter;
    let backupStartedAt;
    let backupCompletedAt;
    let exportedSnapshot;
    try {
      exportedSnapshot = await startExportedSnapshot(querySource);
      snapshotText = exportedSnapshot.exportedAt;
      snapshotAt = Date.parse(snapshotText);
      if (!Number.isFinite(snapshotAt)) throw new Error('source_snapshot_timestamp_invalid');

      try {
        sourceCounts = parseTableCounts(runDockerPsqlWithSnapshot(querySource, exportedSnapshot.snapshotId, countSql));
      } catch (error) {
        throw new Error('logical_source_counts_on_exported_snapshot_failed:' + error);
      }

      backupStartedAt = Date.now();
      runDockerPgDump(querySource, backupPath, exportedSnapshot.snapshotId);
      backupCompletedAt = Date.now();
    } catch (error) {
      throw new Error('logical_backup_exported_snapshot_failed:' + error);
    } finally {
      if (exportedSnapshot) await exportedSnapshot.close();
    }

    try {
      sourceCountsAfter = parseTableCounts(runDockerPsql(querySource, countSql));
    } catch (error) {
      throw new Error('logical_source_counts_after_dump_failed:' + error);
    }

    const bytes = fs.statSync(backupPath).size;
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(backupPath)).digest('hex');
    const rpoSeconds = Math.max(0, (backupCompletedAt - snapshotAt) / 1000);
    if (rpoSeconds > maxRpoSeconds) throw new Error(`rpo_budget_exceeded:${rpoSeconds}`);

    let authUserIds;
    try {
      authUserIds = parseAuthUserIds(runDockerPsql(querySource, authUserIdsSql));
    } catch (error) {
      throw new Error(`logical_source_auth_user_ids_failed:${error}`);
    }
    const authUserStubsPath = path.join(backupDir, 'auth-user-id-stubs.sql');
    fs.writeFileSync(authUserStubsPath, buildAuthUserStubSql(authUserIds), { encoding: 'utf8', mode: 0o600 });

    const restoreConstraints = captureRestoreConstraints(localDbUrl);
    const restoreStartedAt = Date.now();
    try {
      dropRestoreConstraints(localDbUrl, restoreConstraints);
      runDockerPsqlFileRaw(localDbUrl, authUserStubsPath);
      runDockerPsqlFile(localDbUrl, backupPath);
      verifyRestoredRecommendationAuthority(localDbUrl);
      restoreRestoreConstraints(localDbUrl, restoreConstraints);
    } catch (error) {
      throw new Error(`logical_target_restore_failed:${error}`);
    }
    const restoreCompletedAt = Date.now();
    let targetCounts;
    try {
      targetCounts = parseTableCounts(runDockerPsql(localDbUrl, countSql));
    } catch (error) {
      throw new Error(`logical_target_counts_failed:${error}`);
    }
    const rtoSeconds = (restoreCompletedAt - restoreStartedAt) / 1000;

    const mismatchFor = (expectedCounts) => [...new Set([...Object.keys(expectedCounts), ...Object.keys(targetCounts)])]
      .sort()
      .map((tableName) => ({
        tableName,
        sourceCount: expectedCounts[tableName] ?? 0,
        targetCount: targetCounts[tableName] ?? 0,
      }))
      .filter((item) => item.sourceCount !== item.targetCount);

    const mismatchBefore = mismatchFor(sourceCounts);
    const mismatchAfter = mismatchFor(sourceCountsAfter);
    const countTableNames = [...new Set([
      ...Object.keys(sourceCounts),
      ...Object.keys(sourceCountsAfter),
      ...Object.keys(targetCounts),
    ])].sort();
    const sourceDriftTables = countTableNames
      .map((tableName) => ({
        tableName,
        beforeCount: sourceCounts[tableName] ?? 0,
        afterCount: sourceCountsAfter[tableName] ?? 0,
        targetCount: targetCounts[tableName] ?? 0,
      }))
      .filter((item) => item.beforeCount !== item.afterCount);

    // The source count manifest and pg_dump now import the same exported PostgreSQL snapshot.
    // Counts observed after the dump are diagnostic only: concurrent business writes are valid.
    const restoreSnapshotMatch = mismatchBefore.length === 0
      ? 'exported-source-snapshot'
      : null;

    if (!restoreSnapshotMatch) {
      fs.writeFileSync(
        path.join(reportDir, 'logical-restore-count-mismatch.json'),
        JSON.stringify({
          exactHead,
          sourceCounts,
          sourceCountsAfter,
          targetCounts,
          mismatchBefore,
          mismatchAfter,
          sourceDriftTables,
        }, null, 2) + '\n',
        'utf8',
      );
      throw new Error(
        `logical_restore_table_count_mismatch:${JSON.stringify(mismatchBefore)}`,
      );
    }

    const report = {
      mode: 'logical',
      backup_ref: `logical-${exactHead}`,
      artifact_sha256: sha256,
      bytes,
      rpo_seconds: rpoSeconds,
      rto_seconds: rtoSeconds,
      table_count: Object.keys(sourceCounts).length,
      source_snapshot_at: snapshotText,
      source_count_snapshot_match: restoreSnapshotMatch,
      source_snapshot_strategy: 'postgres-exported-snapshot-shared-with-pg-dump',
      source_count_drift_detected: sourceDriftTables.length > 0,
      source_count_drift_tables: sourceDriftTables,
      restore_verified: true,
      restore_target: 'ephemeral-local-supabase-postgres',
      auth_user_stub_count: authUserIds.length,
      auth_user_stub_mode: 'id-only-ephemeral',
      excluded_volatile_tables: [...VOLATILE_RESTORE_TABLES],
      backup_started_at: new Date(backupStartedAt).toISOString(),
      backup_completed_at: new Date(backupCompletedAt).toISOString(),
      restore_started_at: new Date(restoreStartedAt).toISOString(),
      restore_completed_at: new Date(restoreCompletedAt).toISOString(),
      elapsed_seconds: (restoreCompletedAt - startedAt) / 1000,
    };
    fs.writeFileSync(path.join(reportDir, 'logical-backup-restore.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return { name: 'backup-restore-verification', pass: true, status: 200, ...report };
  } finally {
    if (localStarted) {
      try { runCommand('supabase', ['stop'], { cwd: workDir }); } catch {}
    }
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function quoteIdentifier(value) {
  return '"' + String(value).replaceAll('"', '""') + '"';
}

function parseDefinitionRows(raw) {
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    .map((line) => line.split('|'))
    .filter((parts) => parts.length >= 3)
    .map(([tableName, objectName, definition, state]) => ({ tableName, objectName, definition, state: state ?? null }));
}

function captureRestoreConstraints(databaseUrl) {
  const foreignKeys = parseDefinitionRows(runDockerPsql(databaseUrl, `
select n.nspname || '.' || c.relname,
       con.conname,
       pg_get_constraintdef(con.oid, true),
       ''
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and con.contype = 'f'
order by n.nspname, c.relname, con.conname;
`));

  const userTriggers = parseDefinitionRows(runDockerPsql(databaseUrl, `
select n.nspname || '.' || c.relname,
       t.tgname,
       pg_get_triggerdef(t.oid, true),
       t.tgenabled::text
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not t.tgisinternal
  and t.tgenabled <> 'D'
order by n.nspname, c.relname, t.tgname;
`));

  return { foreignKeys, userTriggers };
}

function dropRestoreConstraints(databaseUrl, restoreConstraints) {
  const statements = [];
  for (const fk of restoreConstraints.foreignKeys) {
    statements.push('alter table only ' + fk.tableName + ' drop constraint ' + quoteIdentifier(fk.objectName) + ';');
  }
  for (const trigger of restoreConstraints.userTriggers) {
    statements.push('alter table only ' + trigger.tableName + ' disable trigger ' + quoteIdentifier(trigger.objectName) + ';');
  }
  if (statements.length) runDockerPsql(databaseUrl, statements.join('\n'));
}

function restoreRestoreConstraints(databaseUrl, restoreConstraints) {
  const statements = [];
  for (const fk of restoreConstraints.foreignKeys) {
    statements.push('alter table only ' + fk.tableName + ' add constraint ' + quoteIdentifier(fk.objectName) + ' ' + fk.definition + ';');
  }
  for (const trigger of restoreConstraints.userTriggers) {
    statements.push('alter table only ' + trigger.tableName + ' enable trigger ' + quoteIdentifier(trigger.objectName) + ';');
  }
  if (statements.length) runDockerPsql(databaseUrl, statements.join('\n'));
}
function runtimeEnvironmentCompatible(targetEnv, runtimeEnvironment) {
  if (!runtimeEnvironment || !targetEnv) return true;
  if (/^(prod|production)$/i.test(targetEnv)) return runtimeEnvironment === 'production';
  if (/^(staging|preview|test|testing|qa|development|dev|recovery|dr)([-_].*)?$/i.test(targetEnv)) {
    return runtimeEnvironment !== 'production';
  }
  return true;
}

function runtimeCodeEquivalentToExactHead(deploymentSha) {
  if (!deploymentSha || deploymentSha === exactHead) return true;
  try {
    const changed = execFileSync(
      'git',
      ['diff', '--name-only', deploymentSha + '..' + exactHead],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 },
    ).trim().split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    return changed.length > 0 && changed.every(file => file.startsWith('docs/execution/') || file === 'ONE-PROGRAMMER-SESSION-MEMORY.md');
  } catch {
    return false;
  }
}

function validateRuntimeIdentity(body) {
  const deploymentSha = typeof body?.deployment_sha === 'string' ? body.deployment_sha.trim() : null;
  const deploymentId = typeof body?.deployment_id === 'string' ? body.deployment_id.trim() : null;
  const targetEnv = typeof body?.target_env === 'string' ? body.target_env.trim() : target;
  const runtimeEnvironment = typeof body?.runtime_environment === 'string' ? body.runtime_environment.trim() : null;
  const identity = {
    source_sha: exactHead,
    deployment_sha: deploymentSha,
    deployment_id: deploymentId,
    target_env: targetEnv || null,
    runtime_environment: runtimeEnvironment || null,
  };
  if (!exactHead || exactHead === 'UNKNOWN') return { pass: false, failure: 'SOURCE_SHA_MISSING', identity };
  if (!deploymentSha) return { pass: false, failure: 'DEPLOYMENT_SHA_MISSING', identity };
  if (deploymentSha !== exactHead) {
    const equivalent = runtimeCodeEquivalentToExactHead(deploymentSha);
    identity.runtime_code_equivalent = equivalent;
    if (!equivalent) return { pass: false, failure: 'STALE_RUNTIME', diagnostic_code: 'DEPLOYMENT_SHA_MISMATCH', identity };
  }
  if (!deploymentId) return { pass: false, failure: 'DEPLOYMENT_ID_MISSING', identity };
  if (!runtimeEnvironmentCompatible(targetEnv, runtimeEnvironment)) return { pass: false, failure: 'RUNTIME_ENV_MISMATCH', identity };
  return { pass: true, identity };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function probe(name, url, options = {}, validation = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'x-resilience-token': process.env.RESILIENCE_OPERATIONAL_TOKEN.trim(),
        'x-canary-auth-token': process.env.RESILIENCE_CANARY_AUTH_TOKEN.trim(),
        ...(options.headers || {}),
      },
    });
    const body = await response.text();
    let parsedBody = null;
    try { parsedBody = JSON.parse(body); } catch {}
    let pass = response.ok;
    const result = { name, pass, status: response.status };
    if (validation.expectDeploymentSha) {
      const expectedSha = exactHead;
      const deploymentSha = typeof parsedBody?.deployment_sha === 'string' ? parsedBody.deployment_sha.trim() : null;
      const deploymentId = typeof parsedBody?.deployment_id === 'string' ? parsedBody.deployment_id.trim() : null;
      result.expected_deployment_sha = expectedSha;
      result.deployment_sha = deploymentSha;
      result.deployment_id = deploymentId;
      if (pass && (!expectedSha || expectedSha === 'UNKNOWN')) {
        pass = false;
        result.failure = 'EXACT_HEAD_REQUIRED';
      } else if (pass && !deploymentSha) {
        pass = false;
        result.failure = 'DEPLOYMENT_SHA_MISSING';
      } else if (pass && deploymentSha !== expectedSha) {
        pass = false;
        result.failure = 'DEPLOYMENT_SHA_MISMATCH';
      } else if (pass && !deploymentId) {
        pass = false;
        result.failure = 'DEPLOYMENT_ID_MISSING';
      }
      result.pass = pass;
    }
    checks.push(result);
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: HTTP ${response.status}${result.failure ? ` — ${result.failure}` : ''}`);
    if (!pass) console.error(body.slice(0, 800));
  } catch (error) {
    checks.push({ name, pass: false, error: String(error) });
    console.error(`FAIL ${name}: ${error}`);
  }
}

async function probeOperationalHealthWithPropagation() {
  const maxAttempts = 24;
  const intervalMs = 10_000;
  let last = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(process.env.RESILIENCE_HEALTH_URL, {
        headers: {
          Accept: 'application/json',
          'x-resilience-token': process.env.RESILIENCE_OPERATIONAL_TOKEN.trim(),
        },
      });
      const body = await response.text();
      let parsedBody = null;
      try { parsedBody = JSON.parse(body); } catch {}
      const validation = validateRuntimeIdentity(parsedBody);
      last = {
        name: 'operational-health',
        pass: response.ok && validation.pass,
        status: response.status,
        attempt,
        ...validation.identity,
        ...(validation.failure ? { failure: validation.failure } : {}),
        ...(validation.diagnostic_code ? { diagnostic_code: validation.diagnostic_code } : {}),
      };

      if (last.pass) {
        checks.push(last);
        console.log(`PASS operational-health: HTTP ${response.status} — deployment SHA matched on attempt ${attempt}`);
        return;
      }

      if (attempt < maxAttempts) await sleep(intervalMs);
    } catch (error) {
      last = { name: 'operational-health', pass: false, error: String(error), attempt };
      if (attempt < maxAttempts) await sleep(intervalMs);
    }
  }

  const failure = last?.failure
    || (last?.status ? `HTTP_${last.status}` : 'OPERATIONAL_HEALTH_NO_RESULT');
  const result = { ...(last || { name: 'operational-health', status: 0, pass: false }), pass: false, failure };
  checks.push(result);
  console.error(`FAIL operational-health: HTTP ${result.status ?? 0} — ${failure}`);
}

await probeOperationalHealthWithPropagation();
await probe('tenant-canary', process.env.RESILIENCE_CANARY_URL, {
  headers: { Authorization: `Bearer ${process.env.RESILIENCE_CANARY_AUTH_TOKEN.trim()}` },
});
if (backupMode === 'logical') {
  try {
    const result = await logicalBackupRestore();
    checks.push(result);
    console.log(`PASS backup-restore-verification: logical dump/restore; SHA-256=${result.artifact_sha256}; RPO=${result.rpo_seconds.toFixed(2)}s; RTO=${result.rto_seconds.toFixed(2)}s`);
  } catch (error) {
    checks.push({ name: 'backup-restore-verification', pass: false, mode: 'logical', error: String(error) });
    console.error(`FAIL backup-restore-verification: ${error}`);
  }
} else {
  await probe('backup-restore-verification', process.env.RESILIENCE_BACKUP_VERIFY_URL, { method: 'POST' });
}
async function probeRollbackForwardFix() {
  const name = 'rollback-forward-fix-drill';
  try {
    const response = await fetch(process.env.RESILIENCE_ROLLBACK_DRILL_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const body = await response.text();
    let parsedBody = null;
    try { parsedBody = JSON.parse(body); } catch {}
    const identity = validateRuntimeIdentity(parsedBody);
    const pass = response.ok
      && parsedBody?.status === 'verified'
      && parsedBody?.operation === 'rollback-forward-fix'
      && parsedBody?.mode === 'non-destructive-preflight'
      && identity.pass;
    const result = {
      name, pass, status: response.status,
      operation: parsedBody?.operation ?? null,
      mode: parsedBody?.mode ?? null,
      identity: identity.identity,
      failure: pass ? undefined : (identity.failure ?? 'ROLLBACK_DRILL_SEMANTICS_INVALID'),
    };
    checks.push(result);
    console.log((pass ? 'PASS' : 'FAIL') + ' ' + name + ': HTTP ' + response.status + (result.failure ? ' — ' + result.failure : ''));
    if (!pass) console.error(body.slice(0, 1200));
  } catch (error) {
    checks.push({ name, pass: false, error: String(error) });
    console.error('FAIL ' + name + ': ' + error);
  }
}

await probeRollbackForwardFix();

const failed = checks.filter(check => !check.pass);
const status = failed.length ? 'NOT READY' : 'READY';
writeReport(
  status,
  failed.length ? 'One or more live resilience probes failed.' : 'All configured live resilience probes passed.',
  { backupMode, checks, passed: checks.length - failed.length, failed: failed.length },
);

console.log(`Phase F live result: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) {
  console.error('FAIL-CLOSED: Phase F live resilience is not certified.');
  process.exit(10);
}
console.log('PASS: Phase F live resilience probes completed.');