import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function detectSourceSha() {
  const candidates = [
    process.env.VITE_BUILD_SHA,
    process.env.COMMIT_REF,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.NOW_GITHUB_COMMIT_SHA,
  ].map((value) => value?.trim()).filter(Boolean);
  if (candidates[0]) return candidates[0];
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (git.status === 0 && git.stdout.trim()) return git.stdout.trim();
  throw new Error('BUILD_SOURCE_SHA_UNAVAILABLE');
}

const sourceSha = detectSourceSha();
if (!/^[0-9a-f]{40}$/i.test(sourceSha)) {
  throw new Error('BUILD_SOURCE_SHA_INVALID:' + sourceSha);
}

process.env.VITE_BUILD_SHA = sourceSha;
console.log('BUILD_SOURCE_SHA=' + sourceSha);

const viteCli = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const result = spawnSync(process.execPath, [viteCli, 'build'], {
  env: process.env,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
