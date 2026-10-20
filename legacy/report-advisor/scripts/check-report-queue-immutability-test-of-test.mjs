import { readFileSync } from 'node:fs';
const gate = readFileSync('scripts/check-report-queue-immutability.mjs', 'utf8');
const decoy = gate.replace(/cloneJob\(job\)/g, '// cloneJob(job)').replace(/structuredClone\(request\.parameters\)/g, '// structuredClone(request.parameters)');
if (decoy.includes('cloneJob(job)')) throw new Error('test-of-test failed: clone marker survived as executable text');
if (decoy.match(/parameters:\s*structuredClone\(request\.parameters\)/)) throw new Error('test-of-test failed: nested clone marker survived');
console.log('Report queue immutability test-of-test: PASS');
