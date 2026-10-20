import assert from 'node:assert/strict';

const transitions = {
  DRAFT: ['APPROVED'],
  APPROVED: ['EXECUTING'],
  EXECUTING: ['EXECUTED'],
  EXECUTED: [],
};

function transition(state, next, ctx = {}) {
  assert(transitions[state]?.includes(next), `INVALID_TRANSITION:${state}->${next}`);
  if (next === 'EXECUTING') assert.equal(ctx.approved, true, 'APPROVAL_REQUIRED');
  if (next === 'EXECUTED') assert.equal(ctx.allWorkCompleted, true, 'WORK_COMPLETION_REQUIRED');
  return next;
}

let state = 'DRAFT';
state = transition(state, 'APPROVED', { approved: true });
state = transition(state, 'EXECUTING', { approved: true });
state = transition(state, 'EXECUTED', { allWorkCompleted: true });
assert.equal(state, 'EXECUTED');

assert.throws(() => transition('DRAFT', 'EXECUTING', { approved: false }), /INVALID_TRANSITION/);
assert.throws(() => transition('APPROVED', 'EXECUTED', { allWorkCompleted: false }), /INVALID_TRANSITION/);
assert.throws(() => transition('EXECUTED', 'EXECUTED'), /INVALID_TRANSITION/);

console.log('e2e decision state machine: PASS');
