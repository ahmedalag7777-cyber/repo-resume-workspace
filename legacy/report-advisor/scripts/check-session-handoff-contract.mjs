import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const statePath='docs/execution/CURRENT_SESSION_STATE.md';
const reportPath='docs/execution/PROGRAMMER_CURRENT_REPORT.md';
const archiveRoot='docs/execution/PROGRAMMER_REPORTS';
const allowed=/^(ONE-PROGRAMMER-SESSION-MEMORY\.md|docs\/execution\/CURRENT_SESSION_STATE\.md|docs\/execution\/PROGRAMMER_CURRENT_REPORT\.md|docs\/execution\/PROGRAMMER_REPORTS\/)/;
function die(m){console.error('SESSION_HANDOFF_CONTRACT_FAIL: '+m);process.exit(1)}
function read(p){if(!fs.existsSync(p))die('missing '+p);return fs.readFileSync(p,'utf8')}
function field(s,k){return s.match(new RegExp('^'+k+'\\s*=\\s*(.+)$','m'))?.[1]?.trim()||''}
const state=read(statePath), report=read(reportPath);
for(const k of ['CURRENT_EXACT_HEAD','BRANCH','PR','ACTION_STATUS','NEXT_EXACT_ACTION'])if(!field(state,k))die('missing state field '+k);
for(const k of ['REPORT_FOR_HEAD','UPDATED_AT','WHAT_I_WAS_ASKED_TO_DO','WHAT_I_ACTUALLY_DID','WHAT_IS_PROVEN','FIRST_ACTIVE_FAILURE','ROOT_CAUSE','NEXT_EXACT_ACTION'])if(!field(report,k))die('missing report field '+k);
const reportHead=field(report,'REPORT_FOR_HEAD');
if(['MISSING','UNKNOWN',''].includes(reportHead))die('programmer report is missing/unknown');
try{execFileSync('git',['merge-base','--is-ancestor',reportHead,'HEAD'])}catch{die('REPORT_FOR_HEAD is not an ancestor of HEAD')}
let changed=[];try{changed=execFileSync('git',['diff','--name-only',reportHead+'..HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean)}catch{die('unable to inspect report coverage')}
const unreported=changed.filter(p=>!allowed.test(p));
if(unreported.length)die('stale report; unreported files: '+unreported.join(', '));
if(!fs.existsSync(archiveRoot))die('missing archive root');
if(!/^SESSION HANDOFF\s*=\s*(READY|NOT READY)/mi.test(report))die('invalid SESSION HANDOFF value');
console.log('SESSION_HANDOFF_CONTRACT_PASS report_for='+reportHead+' current_head='+execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());