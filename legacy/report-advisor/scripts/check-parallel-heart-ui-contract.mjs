import fs from 'node:fs';
import assert from 'node:assert/strict';

const contract = fs.readFileSync('docs/PARALLEL_HEART_UI_EXECUTION_CONTRACT.md', 'utf8');

for (const marker of [
  'DOMAIN → DATA → SECURITY → API → RUNTIME → PERSISTENCE → RECOVERY → AUDIT',
  'ROUTES → SCREENS → COMPONENTS → VISUAL HIERARCHY → RTL → RESPONSIVE → STATES → FEEDBACK',
  'REAL DATA → REAL ACTION → LOADING → EMPTY → ERROR → RETRY → SUCCESS → READBACK → PERMISSION STATE → AUDIT / TRACE → BROWSER PROOF',
  'READ-ONLY',
  'NOT IMPLEMENTED',
  'STALE_RUNTIME',
  'DEPLOYMENT_SHA_MISMATCH',
  'FUNCTIONALITY + REAL DATA + STATES + RTL + RESPONSIVE + ACCESSIBILITY + BROWSER EVIDENCE',
]) assert.ok(contract.includes(marker), 'parallel heart/UI contract marker missing: ' + marker);

console.log('PASS: parallel heart + UI execution contract is present and fail-closed.');