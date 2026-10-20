import { readFile } from 'node:fs/promises';

const failures = [];

async function read(path) {
  try { return await readFile(path, 'utf8'); }
  catch { failures.push(`${path}: missing file`); return ''; }
}

const app = await read('src/App.tsx');
const routerConfig = await read('vercel.json');
const tenant = await read('src/lib/supabase.ts');
const queries = await read('src/lib/queries.ts');
const compat = await read('src/lib/queries-compat.ts');
const tsconfig = await read('tsconfig.app.json');
const architecture = await read('scripts/check-architecture-contract.mjs');
const quality = await read('.github/workflows/quality.yml');
const tenantAuthority = await read('supabase/migrations/20260830172000_current_company_id_execute_contract.sql');

const must = (condition, message) => { if (!condition) failures.push(message); };

must((app.match(/<BrowserRouter\b/g) ?? []).length === 1, 'App must have exactly one BrowserRouter application boundary');
must(/AppErrorBoundary/.test(app), 'App must expose an application error boundary');
must(/<Suspense\b/.test(app), 'App must use a Suspense boundary for lazy routes');
must(/path="\*"/.test(app), 'App must have an explicit not-found route');
must((/rewrites/.test(routerConfig) || /routes/.test(routerConfig)) && /index\.html/.test(routerConfig), 'Vercel SPA fallback must exist');

must(/persistSession:\s*true/.test(tenant), 'Auth session persistence must remain enabled');
must(/supabase\.rpc\('current_company_id'\)/.test(tenant), 'Tenant authority must resolve through current_company_id()');
must(!/localStorage.*company|sessionStorage.*company|demo.*company|fallback.*company/i.test(tenant), 'Tenant resolver must not contain browser/demo company fallbacks');
must(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.current_company_id\(\)\s+TO\s+authenticated/i.test(tenantAuthority), 'Canonical tenant authority must be executable by authenticated clients');
must(/REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.current_company_id\(\)\s+FROM\s+anon/i.test(tenantAuthority), 'Canonical tenant authority must remain unavailable to anon');

must(/fetchDashboardSnapshot/.test(queries), 'Canonical dashboard snapshot must own dashboard aggregation');
must(/fetchDashboardIntelligence/.test(queries), 'Canonical dashboard intelligence must own recommendation/alert reads');
must(/Compatibility boundary only/.test(compat), 'Compatibility layer must explicitly declare non-ownership of business truth');
for (const symbol of ['MonthlyTrend','TopCustomers','TopProducts','CategoryBreakdown','AgingBuckets','Forecasts']) {
  must(new RegExp(`canonicalFetch${symbol}`).test(compat), `Compatibility ${symbol} must delegate to canonical query`);
}

must(/strict"\s*:\s*true/.test(tsconfig), 'TypeScript strict mode must remain enabled');
must(/moduleResolution"\s*:\s*"bundler"/.test(tsconfig), 'Bundler module resolution must remain explicit');
must(/@\/lib\/queries/.test(tsconfig), 'Canonical query alias must remain explicit');
must(/npm run typecheck/.test(architecture) && /npm run lint/.test(architecture) && /npm run build/.test(architecture), 'Architecture contract must require typecheck/lint/build');
must(/npm run test:contracts/.test(quality), 'Quality workflow must execute the architecture contract');
must(/test\s+"\$\(git rev-parse HEAD\)"\s*=\s*"\$\{GITHUB_SHA\}"/.test(quality), 'Quality workflow must bind execution to exact checked-out SHA');
must(/name: Phase 1 foundation closure/.test(quality) && /node scripts\/check-phase1-foundation-closure\.mjs/.test(quality), 'Quality workflow must execute the Phase-1 foundation gate');

if (failures.length) {
  console.error('PHASE1_FOUNDATION_CLOSURE_FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PHASE1_FOUNDATION_CLOSURE_PASS');
console.log('Verified: routing boundary, error/loading boundaries, tenant authority, canonical-query ownership, compatibility delegation, TypeScript strictness, SPA fallback, exact-head CI binding, and tenant-helper EXECUTE contract.');
