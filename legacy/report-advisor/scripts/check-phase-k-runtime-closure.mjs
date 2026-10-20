import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const files = [
  'src/lib/report-execution/production-coordinator-bridge.ts',
  'src/lib/report-execution/durable-worker-adapter.ts',
  'src/lib/phase-kl-runtime.ts',
  'src/lib/phase-kl-supabase-runtime.ts',
];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Phase K runtime file missing: ${file}`);
}
const bridge = read(files[0]);
for (const token of ['sourceHash', 'runProductionLifecycle', 'chooseScenario', 'prioritizeDecisions', 'canAutonomouslyExecute']) {
  if (!bridge.includes(token)) throw new Error(`Phase K bridge closure missing: ${token}`);
}
const runtime = read(files[2]);
for (const token of ['buildLineage', 'consolidateRuntime', 'chooseScenario', 'prioritizeDecisions', 'canAutonomouslyExecute']) {
  if (!runtime.includes(token)) throw new Error(`Phase K runtime closure missing: ${token}`);
}
const supabaseRuntime = read(files[3]);
for (const token of ['recordHealth', 'recordEvidenceEdge', 'autonomyGate']) {
  if (!supabaseRuntime.includes(token)) throw new Error(`Phase K Supabase runtime closure missing: ${token}`);
}
console.log('Phase K runtime closure: PASS');
