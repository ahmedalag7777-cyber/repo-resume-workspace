import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const navigationRegistry = fs.readFileSync('src/lib/navigation-registry.ts', 'utf8');
const pages = fs.readdirSync('src/pages').filter((name) => name.endsWith('Page.tsx'));

const routePaths = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
const navigationPaths = [...navigationRegistry.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
const unique = (items) => [...new Set(items)];
const INTERNAL_PROGRESSIVE_DISCLOSURE_ROUTES = new Set(['/proposal-demo', '/reports/smart/:jobId']);
const duplicateNavigationPaths = navigationPaths.filter((path, index) => navigationPaths.indexOf(path) !== index);
const missingFromSidebar = routePaths.filter((path) => !path.startsWith('/*') && path !== '*' && !navigationPaths.includes(path) && !INTERNAL_PROGRESSIVE_DISCLOSURE_ROUTES.has(path));
const missingRoutesForSidebar = navigationPaths.filter((path) => !routePaths.includes(path));

const pageSourceByFile = new Map();
for (const page of pages) {
  pageSourceByFile.set(page, fs.readFileSync(`src/pages/${page}`, 'utf8'));
}
const entrySources = [
  app,
  fs.readFileSync('src/components/AuthGate.tsx', 'utf8'),
];
const pageRef = (source) => [
  ...source.matchAll(/from\s+['"]@\/pages\/([^'"]+)['"]/g),
  ...source.matchAll(/import\([^)]*['"]@\/pages\/([^'"]+)['"]/g),
].map((m) => m[1].endsWith('.tsx') ? m[1] : `${m[1]}.tsx`);

const reachablePageFiles = new Set();
const pendingPageFiles = unique(entrySources.flatMap(pageRef));
while (pendingPageFiles.length) {
  const page = pendingPageFiles.pop();
  if (!page || reachablePageFiles.has(page) || !pageSourceByFile.has(page)) continue;
  reachablePageFiles.add(page);
  pendingPageFiles.push(...pageRef(pageSourceByFile.get(page)));
}
const unreferencedPageFiles = pages.filter((file) => !reachablePageFiles.has(file));

const fail = (label, values) => {
  if (!values.length) return;
  console.error(`FAIL ${label}:\n${values.map((v) => `  - ${v}`).join('\n')}`);
  process.exitCode = 1;
};

console.log(`UI route count: ${routePaths.length}`);
console.log(`Canonical navigation count: ${unique(navigationPaths).length}`);
console.log(`Internal progressive-disclosure routes: ${[...INTERNAL_PROGRESSIVE_DISCLOSURE_ROUTES].join(', ')}`);
console.log(`Page component files: ${pages.length}`);

fail('duplicate navigation registry paths', unique(duplicateNavigationPaths));
fail('routes missing from sidebar navigation', missingFromSidebar);
fail('sidebar links missing a registered route', missingRoutesForSidebar);
fail('page components unreachable from App/AuthGate import graph', unreferencedPageFiles);

if (process.exitCode) {
  console.error('UI route/navigation completeness: FAIL');
  process.exit();
}

console.log('UI route/navigation completeness: PASS');
console.log('Note: route registration does not certify runtime rendering or every interactive control.');