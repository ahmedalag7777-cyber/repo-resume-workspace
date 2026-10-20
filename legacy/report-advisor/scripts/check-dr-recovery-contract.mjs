import assert from 'node:assert/strict';

const manifest = { backup_id:'backup-synthetic-001', source_revision:'a'.repeat(40), created_at:'2026-08-31T00:00:00Z', checksum:'sha256:synthetic-checksum', tenant_scope:'tenant-a', rpo_minutes:60, rto_minutes:120 };
function verifyBackup(m) {
  for (const key of ['backup_id','source_revision','created_at','checksum','tenant_scope']) assert.ok(m[key], `BACKUP_${key.toUpperCase()}_REQUIRED`);
  assert.match(m.source_revision, /^[0-9a-f]{40}$/); assert.match(m.checksum, /^sha256:/);
  assert(Number.isFinite(m.rpo_minutes) && m.rpo_minutes >= 0, 'RPO_REQUIRED'); assert(Number.isFinite(m.rto_minutes) && m.rto_minutes >= 0, 'RTO_REQUIRED');
  return true;
}
function restorePlan(m, target, mode='NON_DESTRUCTIVE') { assert.equal(verifyBackup(m), true); assert(target, 'RESTORE_TARGET_REQUIRED'); assert.equal(mode,'NON_DESTRUCTIVE','NON_DESTRUCTIVE_REQUIRED'); return {backup_id:m.backup_id,target,verified:true}; }
function rollbackPlan(revision, target, approval_id) { assert.match(revision,/^[0-9a-f]{40}$/); assert(target,'ROLLBACK_TARGET_REQUIRED'); assert(approval_id,'ROLLBACK_APPROVAL_REQUIRED'); return {revision,target,approval_id,verified:true}; }

assert.equal(verifyBackup(manifest), true);
assert.deepEqual(restorePlan(manifest,'synthetic-restore'),{backup_id:manifest.backup_id,target:'synthetic-restore',verified:true});
assert.deepEqual(rollbackPlan(manifest.source_revision,'synthetic-runtime','approval-1'),{revision:manifest.source_revision,target:'synthetic-runtime',approval_id:'approval-1',verified:true});
assert.throws(()=>verifyBackup({...manifest,source_revision:'bad'}),/^[\s\S]*$/);
assert.throws(()=>restorePlan(manifest,'target','DESTRUCTIVE'),/NON_DESTRUCTIVE_REQUIRED/);
assert.throws(()=>rollbackPlan(manifest.source_revision,'target',''),/ROLLBACK_APPROVAL_REQUIRED/);
console.log('dr recovery contract: PASS');
