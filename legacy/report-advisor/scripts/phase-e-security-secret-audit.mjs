#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=process.cwd();const files=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).filter(f=>!f.startsWith('.git/'));
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/service_role\s*[:=]\s*["'][^"']{20,}/i,/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']{20,}/i,/sk-[A-Za-z0-9_-]{30,}/];
const findings=[];for(const file of files){let s='';try{s=fs.readFileSync(path.join(root,file),'utf8')}catch{continue}for(const re of patterns)if(re.test(s))findings.push(file)}
if(findings.length){console.error('FAIL-CLOSED: possible hard-coded secret material found');[...new Set(findings)].forEach(f=>console.error(`- ${f}`));process.exit(30)}
console.log(`PASS: secret audit inspected ${files.length} tracked files`);
