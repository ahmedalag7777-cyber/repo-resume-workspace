import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const navigationRegistry = await readFile(new URL('../src/lib/navigation-registry.ts', import.meta.url), 'utf8');

const routePaths = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
const navigationPaths = [...navigationRegistry.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);

const routeSet = new Set(routePaths);
const navigationSet = new Set(navigationPaths);
const intentionallyHiddenRoutes = new Set(['/proposal-demo', '/reports/smart/:jobId']);
const missingFromApp = navigationPaths.filter((path) => !routeSet.has(path));
const missingFromSidebar = routePaths.filter((path) => !path.startsWith('/*') && path !== '*' && !navigationSet.has(path) && !intentionallyHiddenRoutes.has(path));

const requiredRoutes = ['/import/analyze', '/decision-experience', '/metrics', '/reports/executive', '/analytics/liquidity', '/suppliers'];
const missingRequired = requiredRoutes.filter((path) => !routeSet.has(path) || !navigationSet.has(path));

if (missingFromApp.length || missingFromSidebar.length || missingRequired.length) {
  console.error(JSON.stringify({ missingFromApp, missingFromSidebar, missingRequired }, null, 2));
  process.exit(1);
}

if (routePaths.length !== new Set(routePaths).size) {
  console.error('FAIL: duplicate route declarations detected');
  process.exit(1);
}
if (navigationPaths.length !== new Set(navigationPaths).size) {
  console.error('FAIL: duplicate sidebar paths detected');
  process.exit(1);
}

console.log(`PASS: ${routePaths.length} application routes and ${navigationPaths.length} canonical navigation links are in parity.`);
console.log(`PASS: required product routes present: ${requiredRoutes.join(', ')}`);