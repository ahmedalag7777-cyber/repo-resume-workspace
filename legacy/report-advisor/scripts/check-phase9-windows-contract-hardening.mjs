import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = [
  'desktop/main.cjs',
  'desktop/preload.cjs',
  'desktop/package.json',
  'scripts/check-windows-desktop-folder-watch-contract.mjs',
];
for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing Phase 9 surface: ${file}`);
}
const main = read('desktop/main.cjs');
const preload = read('desktop/preload.cjs');
const pkg = read('desktop/package.json');
const guard = read('scripts/check-windows-desktop-folder-watch-contract.mjs');

const stripJsComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');

const runtimeMain = stripJsComments(main);
const requiredRuntimeTokens = [
  'fs.watch', 'recursive:true', 'WATCH_FOLDER_PATH_OUTSIDE_ROOT',
  'queueFileCandidate', 'handleFilesystemEvent', 'scheduleEventRescan',
  'stableSince', 'requiredStableMs=400', 'watchGeneration',
  'activeRescanPromise', 'const latest=new Set(walk(root))',
  'setInterval(()=>{void rescan();}', '30000',
];
const assertRuntimeContract = (source) => {
  for (const token of requiredRuntimeTokens) {
    if (!source.includes(token)) throw new Error(`Phase 9 missing runtime invariant: ${token}`);
  }
};
assertRuntimeContract(runtimeMain);

for (const token of ['contextIsolation:true', 'nodeIntegration:false', 'desktopFolderWatch', 'readFile', 'onFile']) {
  if (!(runtimeMain + stripJsComments(preload)).includes(token)) throw new Error(`Phase 9 missing isolated bridge invariant: ${token}`);
}

for (const token of ['electron', 'electron-builder', 'package:win', 'com.reportadvisor.desktop']) {
  if (!pkg.includes(token)) throw new Error(`Phase 9 missing packaging invariant: ${token}`);
}

if (runtimeMain.includes("startWatch(root)=>startWatch(root)")) throw new Error('Phase 9 rejects renderer-selected arbitrary watch roots');
if (runtimeMain.includes("send('desktop-folder-watch:file',{path:filePath")) throw new Error('Phase 9 rejects absolute path leakage');

// Test-of-test: remove every executable runtime marker and leave comment-only
// decoys behind. Re-parse the tampered source exactly as production evidence is
// parsed; comments must not satisfy the executable invariant.
let tampered = runtimeMain;
for (const token of requiredRuntimeTokens) tampered = tampered.replace(token, '');
tampered += `\n// ${requiredRuntimeTokens.join('\n// ')}`;
let tamperedRejected = false;
try {
  assertRuntimeContract(stripJsComments(tampered));
} catch {
  tamperedRejected = true;
}
if (!tamperedRejected) throw new Error('Phase 9 test-of-test accepted comment-only runtime decoys as executable evidence');

console.log('Phase 9 Windows contract hardening: PASS (source-level; fresh Windows runtime evidence remains separate)');
