import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/BenchmarkPage.tsx', 'utf8');
assert.ok(page.includes('INSUFFICIENT_SAMPLE'));
assert.ok(page.includes('لا يتم اختلاق'));
assert.ok(page.includes('Cohort'));
console.log('BENCHMARK_FAIL_CLOSED_CONTRACT_PASS');
