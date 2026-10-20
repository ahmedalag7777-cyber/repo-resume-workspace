import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const routePaths = [...app.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map((m) => m[1]);
const navPaths = [...sidebar.matchAll(/path:\s*["']([^"']+)["']/g)].map((m) => m[1]);

const normalize = (path) => path.replace(/\/$/, '') || '/';
const routes = new Set(routePaths.map(normalize));
const nav = new Set(navPaths.map(normalize));

const missingRoutes = [...nav].filter((path) => !routes.has(path));
const duplicateNav = navPaths.filter((path, i) => navPaths.indexOf(path) !== i);
const duplicateRoutes = routePaths.filter((path, i) => routePaths.indexOf(path) !== i);

if (missingRoutes.length || duplicateNav.length || duplicateRoutes.length) {
  console.error('Navigation/route contract failed.');
  if (missingRoutes.length) console.error(`Navigation targets without routes: ${missingRoutes.join(', ')}`);
  if (duplicateNav.length) console.error(`Duplicate navigation paths: ${[...new Set(duplicateNav)].join(', ')}`);
  if (duplicateRoutes.length) console.error(`Duplicate route paths: ${[...new Set(duplicateRoutes)].join(', ')}`);
  process.exit(1);
}

console.log(`PASS: ${nav.size} navigation paths resolve to ${routes.size} declared routes.`);
