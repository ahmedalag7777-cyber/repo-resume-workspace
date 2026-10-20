import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { validateCertificationBoundary } from './check-certification-boundary-integrity.mjs';

const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const parent = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
const staleIndex = '# historical candidate\n- CURRENT CODE/TEST CANDIDATE: `0000000000000000000000000000000000000000`';

assert.doesNotThrow(() => validateCertificationBoundary({ index: staleIndex, head, parent }));
assert.throws(() => validateCertificationBoundary({ index: staleIndex, head: parent, parent: '' }), /not the checked-out repository HEAD/);
assert.throws(() => validateCertificationBoundary({ index: staleIndex, head, parent: '0'.repeat(40) }), /differs from checked-out HEAD parent/);

console.log('PASS certification-boundary Test-of-Test: current Git HEAD is authoritative; stale Markdown candidate cannot override it; checkout/parent spoofing is rejected.');
