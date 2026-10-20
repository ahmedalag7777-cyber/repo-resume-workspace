import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
const failures = [];
const notes = [];

if (packageJson.dependencies?.next || packageJson.devDependencies?.next) failures.push('NEXTJS_DEPENDENCY_PRESENT_UNEXPECTEDLY');
if (!packageJson.devDependencies?.vite) failures.push('VITE_DEV_DEPENDENCY_MISSING');
if (!viteConfig.includes('defineConfig({') || !viteConfig.includes('plugins: [react()]')) failures.push('VITE_REACT_BUILD_CONFIGURATION_NOT_DETECTED');

for (const candidate of ['pages','app','next.config.js','next.config.mjs','next.config.ts']) {
  if (fs.existsSync(path.join(root, candidate))) failures.push(`NEXTJS_SERVER_CONVENTION_DETECTED:${candidate}`);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const sourceFiles = walk(path.join(root, 'src'));
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (/getServerSideProps|getStaticProps|getServerSidePaths/.test(source)) failures.push(`NEXT_SERVER_EXPORT:${path.relative(root, file)}`);
  if (/from\s+['"]next\/(server|headers|cookies|navigation|config)['"]/.test(source)) failures.push(`NEXT_RUNTIME_IMPORT:${path.relative(root, file)}`);
}

const dist = path.join(root, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) failures.push('DIST_INDEX_MISSING');
const publicDir = path.join(root, 'public');
const has404 = fs.existsSync(path.join(publicDir, '404.html')) || fs.existsSync(path.join(dist, '404.html'));
if (has404) failures.push('404_HTML_PRESENT_WOULD_CHANGE_CLOUDFLARE_PAGES_SPA_FALLBACK');
else notes.push('No top-level 404.html: Pages default SPA fallback remains available for React Router paths.');

if (packageJson.scripts?.build !== 'vite build') notes.push(`Build script is '${packageJson.scripts?.build ?? 'missing'}'; verify Cloudflare build command before deployment.`);
notes.push('Assessment target: Cloudflare Pages static SPA. Workers/SSR and R2 migration remain separate gates.');

if (failures.length) {
  console.error('Cloudflare Pages compatibility: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Cloudflare Pages compatibility: PASS');
console.log('Architecture: React + Vite SPA; static dist output.');
for (const note of notes) console.log(`NOTE: ${note}`);
