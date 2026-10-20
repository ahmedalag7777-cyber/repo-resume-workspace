import {spawnSync} from 'node:child_process';
import process from 'node:process';
const gates=[
  {label:'production-gate-integrity', command:process.execPath, args:['scripts/check-production-gate-integrity.mjs']},
  {label:'typecheck', command:'npm', args:['run','typecheck','--silent']},
  {label:'build', command:'npm', args:['run','build','--silent']},
];
for(const gate of gates){
  const command = process.platform === 'win32' && gate.command === 'npm' ? 'npm.cmd' : gate.command;
  const r=spawnSync(command,gate.args,{stdio:'inherit',shell:process.platform==='win32' && gate.command==='npm'});
  if(r.status!==0){
    console.error(`Production gate runtime BLOCKED at: ${gate.label}`);
    process.exit(1);
  }
}
console.log('Production gate runtime PASS: integrity, typecheck and build completed.');
