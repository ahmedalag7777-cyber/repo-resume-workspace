#!/usr/bin/env node
/** Phase E extended live probes. Every missing probe is a hard failure. */
const required=['CERT_REALTIME_HEALTH_URL','CERT_BACKUP_DRILL_URL','CERT_OBSERVABILITY_HEALTH_URL','CERT_ROLLBACK_DRILL_URL'];
const missing=required.filter(k=>!process.env[k]?.trim());
if(missing.length){console.error('FAIL-CLOSED: missing Phase E extended probe endpoints');missing.forEach(k=>console.error(`- ${k}`));process.exit(20)}
async function probe(name,url){try{const r=await fetch(url,{headers:{'Cache-Control':'no-store'}});const t=await r.text();const ok=r.ok;console.log(`${ok?'PASS':'FAIL'} ${name}: status=${r.status} body=${t.slice(0,240)}`);return ok}catch(e){console.error(`FAIL ${name}: ${e}`);return false}}
const results=await Promise.all([
 probe('realtime-authorization-health',process.env.CERT_REALTIME_HEALTH_URL),
 probe('backup-restore-drill',process.env.CERT_BACKUP_DRILL_URL),
 probe('observability-evidence',process.env.CERT_OBSERVABILITY_HEALTH_URL),
 probe('rollback-drill',process.env.CERT_ROLLBACK_DRILL_URL),
]);
if(results.some(x=>!x)){console.error('FAIL-CLOSED: Phase E extended live probes failed');process.exit(21)}
console.log('PASS: Phase E extended live probes passed');
