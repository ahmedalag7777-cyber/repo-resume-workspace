import fs from 'node:fs';

const source = fs.readFileSync('src/lib/report-execution/durable-production-runner.ts', 'utf8');
const findings = [];
if (!/export interface DurableSourceSnapshot/.test(source)) findings.push('DurableSourceSnapshot contract is missing');
if (!/loadSourceSnapshot\?:/.test(source)) findings.push('durable runner does not expose a source snapshot loader boundary');
if (!/source\.sourceHash !== input\.sourceHash/.test(source)) findings.push('loaded source hash is not fenced against the durable job hash');
if (!/source\.rows/.test(source)) findings.push('verified source rows are not captured for stage execution');
if (!/sourceRowCount: sourceRows\.length/.test(source)) findings.push('completion evidence does not record the verified source row count');
if (!/job\.tenantId !== tenantId/.test(source)) findings.push('tenant binding check is missing');
if (!/if \(!input\.sourceHash\.trim\(\)\)/.test(source)) findings.push('empty source hash is not rejected');
if (findings.length) { console.error('Report execution source binding contract: FAIL'); findings.forEach((finding) => console.error(`- ${finding}`)); process.exit(1); }
console.log('Report execution source binding contract: PASS');
