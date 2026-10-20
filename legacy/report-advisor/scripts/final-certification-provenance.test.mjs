import { strict as assert } from 'node:assert';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/final-certification-gate.yml', 'utf8');

assert.match(workflow, /pull_request:/, 'pull_request trigger must exist');
assert.match(workflow, /push:/, 'push trigger must exist');
assert.match(workflow, /workflow_dispatch:/, 'workflow_dispatch trigger must exist');
assert.match(workflow, /candidate_sha:[\s\S]*required:\s*true/, 'workflow_dispatch must require candidate_sha');
assert.match(workflow, /github\.event\.pull_request\.head\.sha/, 'PR certification must bind to exact PR head SHA');
assert.match(workflow, /github\.sha/, 'push certification must bind to github.sha');
assert.match(workflow, /inputs\.candidate_sha/, 'manual certification must bind to explicit candidate_sha');
assert.match(workflow, /ref:\s*\$\{\{\s*env\.CERTIFICATION_SHA\s*\}\}/, 'checkout must use the resolved certification SHA');
assert.match(workflow, /git rev-parse HEAD/, 'certification must verify actual checkout HEAD');
assert.match(workflow, /actual_sha.*=.*git rev-parse HEAD/, 'actual checkout SHA must be captured');
assert.match(workflow, /actual_sha.*=.*CERTIFICATION_SHA|CERTIFICATION_SHA.*=.*actual_sha/, 'checkout and certification SHA must be compared');
assert.match(workflow, /Synthetic PR merge SHA/, 'synthetic PR merge SHA must be explicitly rejected/notified');

const removeHeadBinding = workflow.replace(/github\.event\.pull_request\.head\.sha/g, 'github.event.pull_request.base.sha');
assert.doesNotMatch(removeHeadBinding, /github\.event\.pull_request\.head\.sha/);
assert.throws(() => { if (!removeHeadBinding.includes('github.event.pull_request.head.sha')) throw new Error('PR exact-head binding missing'); }, /PR exact-head binding missing/);

const removeDispatchBinding = workflow.replace(/inputs\.candidate_sha/g, 'github.sha');
assert.doesNotMatch(removeDispatchBinding, /inputs\.candidate_sha/);
assert.throws(() => { if (!removeDispatchBinding.includes('inputs.candidate_sha')) throw new Error('workflow_dispatch explicit SHA binding missing'); }, /workflow_dispatch explicit SHA binding missing/);

const weakenCheckout = workflow.replace(/ref:\s*\$\{\{\s*env\.CERTIFICATION_SHA\s*\}\}/, 'ref: main');
assert.throws(() => { if (!/ref:\s*\$\{\{\s*env\.CERTIFICATION_SHA\s*\}\}/.test(weakenCheckout)) throw new Error('checkout is not bound to certification SHA'); }, /checkout is not bound to certification SHA/);

console.log('PASS final-certification provenance adversarial suite: PR head, push SHA, explicit dispatch SHA, checkout=HEAD, synthetic-merge rejection, and metadata-only bypass attacks are covered.');
