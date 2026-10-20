import assert from 'node:assert/strict';
import { InMemoryReportQueue } from '../src/lib/report-execution/queue.ts';
import type { ReportExecutionRequest } from '../src/lib/report-execution/report-execution-contract.ts';

const request: ReportExecutionRequest = {
  reportId: 'report-lease-fencing',
  tenantId: 'tenant-a',
  requestedBy: 'user-a',
  parameters: { scope: 'all' },
  formats: ['web'],
  idempotencyKey: 'lease-fencing-regression',
  sourceSnapshotId: 'snapshot-1',
};
const queue = new InMemoryReportQueue();

// Boundary regression: malformed queue input must fail before cloning/iteration.
assert.throws(() => queue.enqueue({ ...request, formats: undefined } as unknown as ReportExecutionRequest), /at least one output format/);
assert.throws(() => queue.enqueue({ ...request, formats: [] } as ReportExecutionRequest), /at least one output format/);
assert.throws(() => queue.enqueue({ ...request, formats: ['web', 'web'] } as ReportExecutionRequest), /Duplicate output formats/);

const original = queue.enqueue(request, 'run-1', 3);
const duplicate = queue.enqueue(request, 'run-ignored', 3);
assert.equal(duplicate.runId, original.runId, 'idempotent enqueue must return the existing run');

const first = queue.claim('worker-a', 60_000);
assert.ok(first?.leaseToken);
assert.equal(queue.claim('worker-b', 60_000), undefined, 'a second worker cannot claim an actively leased job');
const firstToken = first.leaseToken;
queue.heartbeat('run-1', 'worker-a', firstToken);
assert.throws(() => queue.heartbeat('run-1', 'worker-b', firstToken), /fencing token is stale/);
assert.throws(() => queue.complete('run-1', 'worker-a', 'stale-token'), /fencing token is stale/);

const realNow = Date.now;
const expiredNow = (first.leaseExpiresAt ?? realNow()) + 1;
try {
  Date.now = () => expiredNow;
  assert.throws(() => queue.heartbeat('run-1', 'worker-a', firstToken), /lease has expired/);
  assert.throws(() => queue.complete('run-1', 'worker-a', firstToken), /lease has expired/);
  assert.throws(() => queue.fail('run-1', 'worker-a', firstToken, 'late crash'), /lease has expired/);
  const second = queue.claim('worker-b', 60_000);
  assert.ok(second?.leaseToken);
  assert.notEqual(second.leaseToken, firstToken, 'ownership transfer must rotate the fencing token');
  assert.equal(second.leaseOwner, 'worker-b');
  Date.now = realNow;
  assert.throws(() => queue.complete('run-1', 'worker-a', firstToken), /fencing token is stale/);
  queue.cancel('run-1', 'worker-b', second.leaseToken);
} finally {
  Date.now = realNow;
}
assert.equal(queue.get('run-1')?.status, 'cancelled');
assert.equal(queue.get('run-1')?.leaseToken, undefined);
assert.throws(() => queue.heartbeat('run-1', 'worker-b', 'after-terminal'), /fencing token is stale/);
assert.throws(() => queue.complete('run-1', 'worker-b', 'after-terminal'), /fencing token is stale/);

queue.enqueue({ ...request, idempotencyKey: 'lease-fencing-failure' }, 'run-2', 2);
const failureFirst = queue.claim('worker-a', 60_000);
assert.ok(failureFirst?.leaseToken);
queue.fail('run-2', 'worker-a', failureFirst.leaseToken, 'simulated crash');
const failureSecond = queue.claim('worker-b', 60_000);
assert.ok(failureSecond?.leaseToken);
assert.notEqual(failureSecond.leaseToken, failureFirst.leaseToken);
assert.equal(failureSecond.attempts, 2);
queue.fail('run-2', 'worker-b', failureSecond.leaseToken, 'terminal crash');
assert.equal(queue.get('run-2')?.status, 'failed');
assert.equal(queue.listDeadLetters().length, 1);
assert.equal(queue.get('run-2')?.leaseToken, undefined);
assert.equal(queue.claim('worker-c', 60_000), undefined, 'dead-lettered job must not be claimed again');

console.log('report-execution lease fencing adversarial regression: PASS');
