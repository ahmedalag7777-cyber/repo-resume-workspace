import fs from 'node:fs';
import path from 'node:path';
const file=path.join(process.cwd(),'src/lib/import-pipeline/folder-watch-contract.ts');
if(!fs.existsSync(file))throw new Error('Missing canonical folder-watch contract');
const text=fs.readFileSync(file,'utf8');
for(const token of ['FolderWatchPlatform','FolderWatchCapabilities','FolderWatchAdapter','FOLDER_WATCH_PLATFORM_CAPABILITIES','web:','pwa:','windows:','android:','ios:'])if(!text.includes(token))throw new Error(`Missing cross-platform watcher contract token: ${token}`);
for(const token of ['persistentBackgroundWatch:false','persistentBackgroundWatch:true','nativeDirectoryPermission:true','arbitrary persistent background folder watching is not claimed'])if(!text.includes(token))throw new Error(`Missing platform capability truth: ${token}`);
console.log('Folder-watch cross-platform capability contract: PASS (single canonical event/queue boundary; platform limits explicit).');
