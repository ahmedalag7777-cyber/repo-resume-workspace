import assert from 'node:assert/strict';
import { evaluateAIDataPolicyForSession } from '../src/lib/aiDataPolicy.ts';

const base = { capability: 'embedding', tenantId: 'tenant-a', text: 'approved context', trustedProvider: true };
assert.equal(evaluateAIDataPolicyForSession(base, 'tenant-a').allowed, true);
assert.equal(evaluateAIDataPolicyForSession(base, 'tenant-b').allowed, false);
assert.equal(evaluateAIDataPolicyForSession(base, null).allowed, false);
assert.equal(evaluateAIDataPolicyForSession({ ...base, includeRawBusinessRows: true }, 'tenant-a').allowed, false);
assert.equal(evaluateAIDataPolicyForSession({ ...base, trustedProvider: false }, 'tenant-a').allowed, false);
console.log('PASS authenticated tenant binding');
console.log('PASS cross-tenant AI context blocked');
console.log('PASS unauthenticated AI context blocked');
console.log('PASS raw business rows remain blocked');
