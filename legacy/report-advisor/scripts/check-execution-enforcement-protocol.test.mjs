import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateExecutionEnforcementProtocol, validateCurrentHeadIndex } from './check-execution-enforcement-protocol.mjs';

const protocol = fs.readFileSync('docs/EXECUTION_ENFORCEMENT_PROTOCOL.md', 'utf8');
assert.equal(validateExecutionEnforcementProtocol(protocol), true);

const commentDecoy = protocol.replace(
  /### E-TIME[\s\S]*?### E-MAX/,
  '<!-- E-TIME — Waiting-Time Parallelization -->\n\n### E-MAX',
);
const mustReject = [
  ['comment decoy', commentDecoy],
  ['missing E-TIME', protocol.replace(/### E-TIME[\s\S]*?### E-MAX/, '### E-MAX')],
  ['waiting bypass', `${protocol}\nwaiting for CI may stop and report`],
  ['optional NEXT+1', `${protocol}\nNEXT+1 is optional`],
  ['ignored debt', `${protocol}\nexecution debt may be ignored`],
  ['index closure decoy', `${protocol}\nindex update counts as execution closure`],
];

for (const [name, candidate] of mustReject) assert.throws(() => validateExecutionEnforcementProtocol(candidate), undefined, name);

const currentHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const parentHead = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
const staleIndex = '# stale index candidate: `0000000000000000000000000000000000000000`';

assert.equal(validateCurrentHeadIndex(staleIndex, currentHead, parentHead), true);
assert.throws(() => validateCurrentHeadIndex(staleIndex, parentHead, currentHead), /differs from checked-out repository HEAD/);
assert.throws(() => validateCurrentHeadIndex(staleIndex, currentHead, '0'.repeat(40)), /differs from checked-out HEAD parent/);

console.log('PASS v3.6 enforcement adversarial test-of-test (real git ancestry + governance-only boundary)');
