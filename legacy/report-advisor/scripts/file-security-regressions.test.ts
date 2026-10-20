import assert from 'node:assert/strict';
import { computeSHA256 } from '../src/lib/file-engine/file-identity-core.ts';

const digest = await computeSHA256(new TextEncoder().encode('Report-Advisor').buffer);
assert.equal(digest, 'ea7fb16487257dcfbb1d2ea8fa0dbc32b0578529757f3141d4cd0873b1ad3251');

console.log('PASS: file identity uses the SHA-256 algorithm and does not silently downgrade to a weaker hash.');
