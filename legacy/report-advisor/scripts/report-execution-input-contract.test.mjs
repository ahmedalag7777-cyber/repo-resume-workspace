import assert from 'node:assert/strict';
import { assertExecutionRequest, assertEvidenceTenant } from '../src/lib/report-execution/report-execution-contract.ts';

const valid = () => ({
  reportId: 'report-1', tenantId: 'tenant-a', requestedBy: 'user-1',
  parameters: { period: '2026-09' }, formats: ['web'], idempotencyKey: 'request-1', sourceSnapshotId: 'snapshot-1',
});

assert.doesNotThrow(() => assertExecutionRequest(valid()));
for (const field of ['reportId', 'tenantId', 'requestedBy', 'idempotencyKey']) {
  for (const value of ['', '   ', null, 42]) {
    const request = valid(); request[field] = value;
    assert.throws(() => assertExecutionRequest(request), /Invalid report execution/);
  }
}
for (const sourceSnapshotId of ['', '   ', null, 42]) {
  assert.throws(() => assertExecutionRequest({ ...valid(), sourceSnapshotId }), /source snapshot identity/);
}
for (const parameters of [[], null, 'not-an-object', 42]) {
  assert.throws(() => assertExecutionRequest({ ...valid(), parameters }), /Invalid report execution parameters/);
}
assert.throws(() => assertExecutionRequest([]), /Invalid report execution request/);
assert.throws(() => assertExecutionRequest(null), /Invalid report execution request/);
assert.throws(() => assertExecutionRequest(undefined), /Invalid report execution request/);
assert.throws(() => assertExecutionRequest({}), /Invalid report execution/);
assert.throws(() => assertExecutionRequest({ ...valid(), formats: [] }), /at least one output format/);
assert.throws(() => assertExecutionRequest({ ...valid(), formats: ['web', 'web'] }), /Duplicate output formats/);
assert.throws(() => assertExecutionRequest({ ...valid(), formats: ['docx'] }), /Unsupported report output format/);
assert.doesNotThrow(() => assertEvidenceTenant({ tenantId: 'tenant-a' }, 'tenant-a'));
assert.throws(() => assertEvidenceTenant({ tenantId: 'tenant-b' }, 'tenant-a'), /tenant mismatch/);
assert.throws(() => assertEvidenceTenant({ tenantId: 'tenant-a' }, '   '), /tenant identity/);
console.log('Report execution input contract: PASS');
