import { readFileSync } from 'node:fs';

const source = readFileSync('src/lib/import-pipeline/platform-folder-capability.ts', 'utf8');
const required = [
  "export type FolderRuntime = 'web' | 'pwa' | 'desktop' | 'android' | 'ios';",
  "'persistent-native-watch'",
  "'active-session-poll'",
  'canWatchInBackground',
  'detectFolderCapability',
  'isPersistentFolderWatch',
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Missing cross-platform folder capability contract token: ${token}`);
}

const ios = source.match(/case 'ios':[\s\S]*?case 'pwa':/);
if (!ios || !ios[0].includes('canWatchInBackground: false')) {
  throw new Error('iOS must fail closed for arbitrary background local-folder watching.');
}

const web = source.match(/case 'web':[\s\S]*?return \{/);
if (!web) throw new Error('Web capability branch missing.');

console.log('cross-platform-folder-capability: PASS');
