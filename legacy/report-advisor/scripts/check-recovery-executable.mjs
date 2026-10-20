import assert from 'node:assert/strict';

const phases = [
  { name: 'backup', required: ['create', 'integrity', 'manifest'] },
  { name: 'restore', required: ['target', 'integrity', 'validation'] },
  { name: 'rollback', required: ['artifact', 'precondition', 'verification'] },
];

function validatePlan(plan) {
  const errors = [];
  for (const phase of phases) {
    const step = plan[phase.name];
    if (!step) { errors.push(`${phase.name}:missing`); continue; }
    for (const key of phase.required) if (!step[key]) errors.push(`${phase.name}:${key}`);
  }
  if (plan.restore?.production === true) errors.push('restore:production-forbidden-in-contract');
  if (plan.rollback?.destructive === true) errors.push('rollback:destructive-forbidden-in-contract');
  return errors;
}

const safe = {
  backup: { create: true, integrity: true, manifest: true },
  restore: { target: 'staging', integrity: true, validation: true, production: false },
  rollback: { artifact: 'exact-sha', precondition: true, verification: true, destructive: false },
};
assert.deepEqual(validatePlan(safe), []);

const missingValidation = structuredClone(safe);
delete missingValidation.restore.validation;
assert.ok(validatePlan(missingValidation).includes('restore:validation'));

const unsafeProduction = structuredClone(safe);
unsafeProduction.restore.production = true;
assert.ok(validatePlan(unsafeProduction).includes('restore:production-forbidden-in-contract'));

const unsafeRollback = structuredClone(safe);
unsafeRollback.rollback.destructive = true;
assert.ok(validatePlan(unsafeRollback).includes('rollback:destructive-forbidden-in-contract'));

console.log('PASS backup requires creation + integrity + manifest');
console.log('PASS restore requires target + integrity + validation');
console.log('PASS rollback requires exact artifact + precondition + verification');
console.log('PASS production restore is fail-closed');
console.log('PASS destructive rollback is fail-closed');
