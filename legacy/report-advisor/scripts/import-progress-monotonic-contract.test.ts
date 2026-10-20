import assert from 'node:assert/strict';

/**
 * Contract guard for import progress monotonicity.
 * The DB function must never accept a counter snapshot older than the
 * persisted state. This pure contract mirrors the required invariant.
 */
function applyProgress(prev: { processed:number; valid:number; invalid:number; quarantined:number; duplicate:number }, next:{processed:number;valid:number;invalid:number;quarantined:number;duplicate:number}) {
  const processed = Math.max(prev.processed, next.processed);
  const valid = Math.max(prev.valid, next.valid);
  const invalid = Math.max(prev.invalid, next.invalid);
  const quarantined = Math.max(prev.quarantined, next.quarantined);
  const duplicate = Math.max(prev.duplicate, next.duplicate);
  return { processed, valid, invalid, quarantined, duplicate };
}

const current = { processed: 900, valid: 850, invalid: 40, quarantined: 5, duplicate: 5 };
const stale = { processed: 700, valid: 650, invalid: 30, quarantined: 3, duplicate: 4 };
assert.deepEqual(applyProgress(current, stale), current, 'stale progress must not regress persisted counters');

const forward = { processed: 950, valid: 890, invalid: 45, quarantined: 6, duplicate: 9 };
assert.deepEqual(applyProgress(current, forward), forward, 'forward progress must advance counters');

console.log('IMPORT_PROGRESS_MONOTONIC_CONTRACT_PASS');
