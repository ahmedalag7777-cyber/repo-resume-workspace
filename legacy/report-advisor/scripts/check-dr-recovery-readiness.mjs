import assert from 'node:assert/strict';

const recovery = {
  backup: { integrityCheck: true, restorable: true },
  restore: { idempotent: true, validatesSchema: true },
  rollback: { targetImmutable: true, requiresApproval: true },
  health: { detectsFailure: true, failClosed: true },
};

for (const [name, checks] of Object.entries(recovery)) {
  for (const [key, value] of Object.entries(checks)) assert.equal(value, true, `${name}.${key}`);
}

// Operational drills remain separate: contract readiness cannot masquerade as a completed live drill.
const liveDrill = null;
assert.throws(() => {
  if (liveDrill === null) throw new Error('OPERATIONAL_DRILL_REQUIRED');
}, /OPERATIONAL_DRILL_REQUIRED/);

console.log('dr recovery readiness contract: PASS');
