import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowDir = path.join(root, '.github', 'workflows');
const files = fs.existsSync(workflowDir)
  ? fs.readdirSync(workflowDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  : [];

const failures = [];
for (const file of files) {
  const text = fs.readFileSync(path.join(workflowDir, file), 'utf8');
  if (/continue-on-error:\s*true/i.test(text)) failures.push(`${file}: continue-on-error=true`);
  const concurrency = text.match(/concurrency:\s*\n\s*group:\s*(.+)\n\s*cancel-in-progress:\s*(true|false)/m);
  if (concurrency) {
    const group = concurrency[1].trim();
    const workflowName = file.replace(/\.ya?ml$/i, '');
    const workflowScoped = /github\.workflow(?:_ref)?/.test(group) || new RegExp(`(?:^|[-_/])${workflowName}(?:[-_/]|$)`).test(group);
    if (!workflowScoped) failures.push(`${file}: concurrency lacks workflow-scoped key`);
  }
  if (file === 'quality.yml' && /cancel-in-progress:\s*true/i.test(text)) failures.push('quality.yml: cancel-in-progress must remain false');
}
const quality = fs.readFileSync(path.join(workflowDir, 'quality.yml'), 'utf8');
if (!/cancel-in-progress:\s*false/i.test(quality)) failures.push('quality.yml: missing explicit cancel-in-progress=false');
if (!/github\.run_id/.test(quality)) failures.push('quality.yml: concurrency must include github.run_id');
if (failures.length) {
  console.error('Workflow batch integrity failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Workflow batch integrity PASS (${files.length} workflow files)`);
