import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowDir = path.join(root, '.github/workflows');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const quality = read('.github/workflows/quality.yml');
const productionBoundary = read('.github/workflows/production-evidence-boundary.yml');
const releaseCertification = read('.github/workflows/release-certification.yml');
const jkl = read('.github/workflows/j-k-l-runtime-wave.yml');
const autonomy = read('.github/workflows/autonomy-safety-wave.yml');
const phaseF = read('.github/workflows/phase-f-live-resilience.yml');

const requiredQualityGates = [
  'test:phase-k-runtime',
  'test:phase-l-runtime',
  'test:phase-l-resumable-execution',
  'test:phase-m-certification',
  'test:k-to-s-closure',
  'test:k-to-s-deep-closure',
  'test:production-release-blockers',
  'test:production-certification-contract',
];

for (const gate of requiredQualityGates) if (!quality.includes(gate)) throw new Error(`Canonical quality path missing: ${gate}`);
if (!quality.includes('push: {branches: [main]}')) throw new Error('Quality must remain the canonical main push gate');
if (!productionBoundary.includes('workflow_run:')) throw new Error('Production evidence boundary must be release-workflow driven');
if (!productionBoundary.includes('workflows: [release-certification]')) throw new Error('Production evidence boundary must bind to release-certification');
if (!productionBoundary.includes("github.event.workflow_run.conclusion == 'success'")) throw new Error('Production evidence boundary must reject unsuccessful release certification');
if (productionBoundary.includes('push:\n    branches: [main]')) throw new Error('Production evidence boundary must not consume an unbound main push');
if (!productionBoundary.includes('actions/download-artifact@v4')) throw new Error('Production evidence boundary must consume the exact release artifact');
if (!productionBoundary.includes('consumption-proof.json')) throw new Error('Production evidence boundary must emit consumption proof');
if (!releaseCertification.includes('certification_run_id')) throw new Error('Release certification must bind evidence to its workflow run');
if (!releaseCertification.includes('manifest_id')) throw new Error('Release certification must emit a manifest identity');
if (!releaseCertification.includes('certification-decision.json')) throw new Error('Release certification must emit a certification decision');

for (const [name, text] of [['j-k-l-runtime-wave', jkl], ['autonomy-safety-wave', autonomy]]) {
  if (/^ {2}push:\s*(?:\{|$)/m.test(text)) throw new Error(`${name} must not define a push trigger; it is a manual/scheduled wave`);
}
if (!/^  push:\s*\n\s*branches:\s*\[main\]/m.test(phaseF)) {
  throw new Error('phase-f-live-resilience must remain a main-push exact-SHA runtime certification workflow');
}

const names = fs.readdirSync(workflowDir).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));
function pushTrigger(text) {
  const inline = text.match(/^ {2}push:\s*\{([^}]*)\}/m);
  if (inline) return { present: true, config: inline[1] };
  const match = text.match(/^ {2}push:\s*$/m);
  if (!match) return { present: false, config: '' };
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  // Workflow trigger siblings share two-space indentation. Stop before the next
  // sibling so pull_request.paths cannot be mistaken for a push path filter.
  const nextTrigger = rest.search(/^ {2}[A-Za-z0-9_-]+:[ \t]*(?:\r?$|\{)/m);
  const block = nextTrigger >= 0 ? rest.slice(0, nextTrigger) : rest;
  return { present: true, config: block };
}

const pushTriggerRegression = [
  'name: parser-regression',
  'on:',
  '  push:',
  '    branches: [main]',
  '  pull_request:',
  '    branches: [main]',
  '    paths:',
  "      - 'src/**'",
  '  workflow_dispatch:',
].join('\n');
const parsedPushRegression = pushTrigger(pushTriggerRegression);
if (
  !parsedPushRegression.present ||
  !/branches\s*:\s*\[main\]/.test(parsedPushRegression.config) ||
  /paths\s*:/.test(parsedPushRegression.config)
) {
  throw new Error('Push-trigger parser must isolate sibling pull_request path filters from canonical main push checks');
}

const pushWorkflows = [];
const canonicalMainPushWorkflows = [];
const scopedPushWorkflows = [];
const broadPushWorkflows = [];
for (const file of names) {
  const trigger = pushTrigger(read(`.github/workflows/${file}`));
  if (!trigger.present) continue;
  pushWorkflows.push(file);
  const config = trigger.config.replace(/\s+/g, ' ');
  const targetsMain = /branches\s*:\s*\[?\s*main\s*\]?/.test(config);
  const hasBranchRestriction = /branches\s*:|branches-ignore\s*:/.test(config);
  const hasPathRestriction = /paths\s*:|paths-ignore\s*:/.test(config);
  const hasTagRestriction = /tags\s*:|tags-ignore\s*:/.test(config);
  const isCanonicalMain = targetsMain && !hasPathRestriction && !hasTagRestriction;
  if (isCanonicalMain) canonicalMainPushWorkflows.push(file);
  if (!isCanonicalMain) scopedPushWorkflows.push(file);
  if (!hasBranchRestriction && !hasPathRestriction && !hasTagRestriction) broadPushWorkflows.push(file);
}
for (const required of ['quality.yml', 'phase-f-live-resilience.yml']) {
  if (!canonicalMainPushWorkflows.includes(required)) {
    throw new Error(`Expected ${required} to be a canonical main push workflow, found: ${canonicalMainPushWorkflows.join(', ') || 'none'}`);
  }
}
const governanceBroad = new Set(['execution-enforcement-contract.yml', 'final-certification-gate.yml']);
const nonCanonicalBroad = broadPushWorkflows.filter((file) => file !== 'quality.yml' && !governanceBroad.has(file));
if (nonCanonicalBroad.length) throw new Error(`Non-canonical broad push workflows are not allowed: ${nonCanonicalBroad.join(', ')}`);
if (!broadPushWorkflows.includes('execution-enforcement-contract.yml')) throw new Error('Execution enforcement contract must remain broad-push to cover every repository mutation');
if (!broadPushWorkflows.includes('final-certification-gate.yml')) throw new Error('Final certification gate must remain broad-push to bind every candidate push to exact SHA provenance');

console.log(JSON.stringify({
  contract: 'ci-execution-topology',
  canonicalPushGate: 'quality.yml',
  pushWorkflows,
  canonicalMainPushWorkflows,
  productionEvidenceBoundary: 'release-certification -> workflow_run -> exact artifact -> consumption proof',
  scopedPushWorkflows,
  governanceBroadPushWorkflows: ['execution-enforcement-contract.yml', 'final-certification-gate.yml'],
  manualWaves: ['j-k-l-runtime-wave.yml', 'autonomy-safety-wave.yml'],
  exactMainShaRuntimeWaves: ['phase-f-live-resilience.yml'],
}));