#!/usr/bin/env node
/** Phase E live Production SaaS certification. Fail-closed. */
const required=['CERT_TARGET_ENV','CERT_SUPABASE_URL','CERT_SUPABASE_ANON_KEY','CERT_TENANT_A_ID','CERT_TENANT_B_ID','CERT_USER_A_JWT','CERT_USER_B_JWT'];
const missing=required.filter(k=>!process.env[k]?.trim());
const target=process.env.CERT_TARGET_ENV?.trim()||'UNSET';
if(missing.length){console.error('FAIL-CLOSED: missing live certification configuration');missing.forEach(k=>console.error(`- ${k}`));process.exit(2)}
if(!/^https:\/\//.test(process.env.CERT_SUPABASE_URL)){console.error('FAIL-CLOSED: Supabase URL must use HTTPS');process.exit(3)}
if(process.env.CERT_TENANT_A_ID===process.env.CERT_TENANT_B_ID){console.error('FAIL-CLOSED: tenants must be distinct');process.exit(4)}
if(/^(prod|production)$/i.test(target)&&process.env.CERT_ALLOW_PRODUCTION!=='true'){console.error('FAIL-CLOSED: production requires CERT_ALLOW_PRODUCTION=true');process.exit(5)}
const base=process.env.CERT_SUPABASE_URL.replace(/\/$/,'');const anon=process.env.CERT_SUPABASE_ANON_KEY;const A=process.env.CERT_TENANT_A_ID;const B=process.env.CERT_TENANT_B_ID;
async function req(path,jwt,opt={}){const r=await fetch(`${base}${path}`,{...opt,headers:{apikey:anon,Authorization:`Bearer ${jwt}`,'Content-Type':'application/json',...(opt.headers||{})}});const t=await r.text();let body;try{body=t?JSON.parse(t):null}catch{body=t}return{status:r.status,ok:r.ok,body}}
const checks=[];function check(name,pass,detail){checks.push({name,pass});console.log(`${pass?'PASS':'FAIL'} ${name}: ${detail}`)}
async function run(){
 console.log(`Phase E live certification target=${target}`);
 const anonR=await fetch(`${base}/rest/v1/file_records?select=id&limit=1`,{headers:{apikey:anon}});check('anonymous-lockdown',anonR.status>=401&&anonR.status<500,`status=${anonR.status}`);
 const aForeign=await req(`/rest/v1/file_records?select=id,company_id&company_id=eq.${encodeURIComponent(B)}&limit=1`,process.env.CERT_USER_A_JWT);const ar=Array.isArray(aForeign.body)?aForeign.body:[];check('tenant-A-cannot-read-B',aForeign.ok&&ar.length===0,`status=${aForeign.status},rows=${ar.length}`);
 const bForeign=await req(`/rest/v1/file_records?select=id,company_id&company_id=eq.${encodeURIComponent(A)}&limit=1`,process.env.CERT_USER_B_JWT);const br=Array.isArray(bForeign.body)?bForeign.body:[];check('tenant-B-cannot-read-A',bForeign.ok&&br.length===0,`status=${bForeign.status},rows=${br.length}`);
 const own=await req(`/rest/v1/file_records?select=id,company_id&company_id=eq.${encodeURIComponent(A)}&limit=5`,process.env.CERT_USER_A_JWT);const ownRows=Array.isArray(own.body)?own.body:[];check('tenant-A-own-read',own.ok&&ownRows.every(r=>r.company_id===A),`status=${own.status},rows=${ownRows.length}`);
 const bucket=process.env.CERT_STORAGE_BUCKET,oa=process.env.CERT_STORAGE_OBJECT_A,ob=process.env.CERT_STORAGE_OBJECT_B;
 if(bucket&&oa&&ob){const foreign=await req(`/storage/v1/object/${encodeURIComponent(bucket)}/${ob}`,process.env.CERT_USER_A_JWT);check('storage-cross-tenant-denial',[401,403,404].includes(foreign.status),`status=${foreign.status}`);const ownObj=await req(`/storage/v1/object/${encodeURIComponent(bucket)}/${oa}`,process.env.CERT_USER_A_JWT);check('storage-own-object',[200,206].includes(ownObj.status),`status=${ownObj.status}`)}else check('storage-live-probes-configured',false,'missing CERT_STORAGE_BUCKET/OBJECT_A/OBJECT_B');
 const endpoint=process.env.CERT_AI_RETRIEVAL_ENDPOINT;if(endpoint){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.CERT_USER_A_JWT}`},body:JSON.stringify({tenantId:A,query:'__CERT_CROSS_TENANT_SENTINEL__',limit:5})});const t=await r.text();check('ai-retrieval-no-cross-tenant-evidence',r.ok&&!t.includes(B),`status=${r.status},tenantB_leaked=${t.includes(B)}`)}else check('ai-retrieval-live-probe-configured',false,'missing CERT_AI_RETRIEVAL_ENDPOINT');
 const failed=checks.filter(x=>!x.pass);console.log(`Phase E result: ${checks.length-failed.length}/${checks.length} probes passed`);if(failed.length){console.error('FAIL-CLOSED: Phase E is not live-certified');process.exit(10)}console.log('PASS: Phase E live certification probes passed')}
run().catch(e=>{console.error(`FAIL-CLOSED: ${e?.stack||e}`);process.exit(11)})
