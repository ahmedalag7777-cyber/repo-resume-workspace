import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { baseline } from './production-regression-baseline.mjs';
import { evaluateRelease } from './production-release-decision.mjs';
const root=process.cwd();
const sha256=v=>crypto.createHash('sha256').update(v).digest('hex');
const lock=fs.readFileSync(path.join(root,'package-lock.json'));
const dir=path.join(root,'supabase/migrations');
const migrations=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort();
const dependencyFingerprint=sha256(lock);
const migrationsFingerprint=sha256(migrations.map(f=>`${f}\n${fs.readFileSync(path.join(dir,f))}`).join('\n'));
const sourceSha=process.env.GITHUB_SHA;
if(process.env.CI&&!sourceSha) throw new Error('Release decision provenance requires GITHUB_SHA in CI');
const fixtureSha=sourceSha||'0'.repeat(40);
const fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'release-decision-provenance-'));
const resultsPath=path.join(fixtureRoot,'release-evidence','production-regression-results.json');
const scenarios={};
try{
  for(const [id,b] of Object.entries(baseline)){
    const evidencePath=path.join(fixtureRoot,'release-evidence','provenance-fixture',`${id}.json`);
    fs.mkdirSync(path.dirname(evidencePath),{recursive:true});
    const evidenceBase={exact_sha:fixtureSha,scenario_id:id,result:'PASS'};
    const evidence_id=sha256(JSON.stringify(evidenceBase));
    fs.writeFileSync(evidencePath,JSON.stringify({...evidenceBase,evidence_id})+'\n');
    scenarios[id]={scenario_id:id,status:'PASS',exact_sha:fixtureSha,evidence_id,evidence_path:`release-evidence/provenance-fixture/${id}.json`,expected:b.expected,stages:b.stages};
  }
  fs.mkdirSync(path.dirname(resultsPath),{recursive:true});
  const good={source_sha:fixtureSha,scenarios};
  const decision=evaluateRelease(good,fixtureSha,resultsPath);
  if(decision.release!=='approved') throw new Error(`Known-good regression baseline must be approved: ${decision.failures?.[0]?.reason||'unknown'}`);
  const first=Object.keys(scenarios)[0];
  const blockedScenarios={...scenarios,[first]:{...scenarios[first],expected:'broken'}};
  const blocked=evaluateRelease({source_sha:fixtureSha,scenarios:blockedScenarios},fixtureSha,resultsPath);
  if(blocked.release!=='blocked') throw new Error('Release decision is not fail-closed');
  console.log(JSON.stringify({contract:'release-decision-provenance',decision:decision.release,blockedDecision:blocked.release,sourceSha:sourceSha||'local',dependencyFingerprint,migrationsFingerprint,scenarioCount:decision.scenarioCount}));
}finally{
  fs.rmSync(fixtureRoot,{recursive:true,force:true});
}
