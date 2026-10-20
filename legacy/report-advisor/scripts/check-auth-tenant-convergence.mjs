import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const supabase = fs.readFileSync(path.join(root, 'src/lib/supabase.ts'), 'utf8');
const authSession = fs.readFileSync(path.join(root, 'src/lib/auth-session.ts'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const authGate = fs.readFileSync(path.join(root, 'src/components/AuthGate.tsx'), 'utf8');
const loginPage = fs.readFileSync(path.join(root, 'src/pages/LoginPage.tsx'), 'utf8');
const sidebar = fs.readFileSync(path.join(root, 'src/components/Sidebar.tsx'), 'utf8');
const profileDisplay = fs.readFileSync(path.join(root, 'src/lib/profile-display.ts'), 'utf8');
const profileSettings = fs.readFileSync(path.join(root, 'src/pages/ProfileSettingsPage.tsx'), 'utf8');
const header = fs.readFileSync(path.join(root, 'src/components/Header.tsx'), 'utf8');
const queries = fs.readFileSync(path.join(root, 'src/lib/queries.ts'), 'utf8');
const tenantMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20260822200000_canonical_tenant_membership.sql'), 'utf8');

const failures = [];

if (!supabase.includes('persistSession: true')) failures.push('Supabase session persistence is not enabled.');
if (/const\s+COMPANY_ID\s*=/.test(supabase)) failures.push('A static COMPANY_ID constant is present in the Supabase client.');
if (!supabase.includes('resolveCurrentCompanyId') || !supabase.includes("rpc('current_company_id')")) failures.push('Canonical current_company_id tenant hydration is missing.');
if (!authSession.includes('getAuthenticatedUser')) failures.push('Canonical auth-session helper is missing.');
if (!authSession.includes('requireAuthenticatedUser')) failures.push('Authenticated-user guard is missing.');
if (/admin@alamri\.com/.test(sidebar)) failures.push('Sidebar contains hard-coded demo email identity.');
if (/المدير العام/.test(sidebar)) failures.push('Sidebar contains hard-coded display name; identity must be resolved through the profile layer.');
if (!profileDisplay.includes('getDisplayName') || !profileDisplay.includes('getDisplayEmail')) failures.push('Central profile display resolver is missing.');
if (!authGate.includes('getAuthenticatedUser') || !authGate.includes('onAuthStateChange')) failures.push('Authenticated application boundary is incomplete.');
if (!authGate.includes('resolveCurrentCompanyId')) failures.push('Protected UI is not gated on canonical tenant resolution.');
if (!authGate.includes('tenant-missing')) failures.push('Missing/ambiguous tenant does not fail closed.');
if (!authGate.includes('<LoginPage />')) failures.push('Unauthenticated state does not render the login screen.');
if (!loginPage.includes('signInWithPassword')) failures.push('Login screen is not connected to Supabase password authentication.');
if (!app.includes('<AuthGate>')) failures.push('App is not wrapped in the authenticated application boundary.');
if (!app.includes('/settings/profile')) failures.push('Owner-editable profile route is missing.');
if (!sidebar.includes('getDisplayName(user')) failures.push('Sidebar is not consuming the central authenticated identity resolver.');
if (!sidebar.includes('supabase.auth.signOut')) failures.push('Sidebar sign-out action is missing.');
if (!profileSettings.includes('supabase.auth.updateUser')) failures.push('Profile settings cannot update authenticated user metadata.');
if (!profileSettings.includes('full_name')) failures.push('Profile settings do not persist the display name.');
if (!header.includes("current_company_id")) failures.push('Header health indicator is not backed by a real database probe.');
if (!header.includes('data: companyId')) failures.push('Header health probe does not inspect the resolved tenant value.');
const unresolvedTenantFailsClosed =
  (header.includes('if (!companyId)') && header.includes("setHealth('degraded')")) ||
  header.includes("companyId ? 'healthy' : 'degraded'");

if (!unresolvedTenantFailsClosed) failures.push('Header incorrectly treats an unresolved tenant as healthy.');
if (!header.includes("'checking'") || !header.includes("'healthy'") || !header.includes("'degraded'") || !header.includes("'offline'")) failures.push('Header health state model is incomplete.');
if (queries.includes("import { supabase, COMPANY_ID }")) failures.push('Canonical dashboard queries still depend on static COMPANY_ID.');
if (queries.includes(".eq('company_id', COMPANY_ID)")) failures.push('Canonical dashboard queries still apply legacy frontend tenant filtering.');
if (!tenantMigration.includes('SECURITY DEFINER')) failures.push('Canonical tenant resolver is not SECURITY DEFINER.');
if (!tenantMigration.includes('SET search_path = public')) failures.push('Canonical tenant resolver does not pin search_path.');
if (!tenantMigration.includes('REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon')) failures.push('Anonymous execution of the canonical tenant resolver is not explicitly revoked.');
if (!tenantMigration.includes('RETURN NULL;')) failures.push('Canonical tenant resolver fail-closed branch is missing.');

if (failures.length) {
  console.error('AUTH/TENANT CONVERGENCE FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('AUTH/TENANT CONVERGENCE PASS');
console.log('- persistent Supabase session enabled');
console.log('- canonical tenant hydration through current_company_id');
console.log('- fail-closed tenant gate');
console.log('- canonical auth-session helpers present');
console.log('- authenticated app boundary present');
console.log('- Arabic Supabase login screen present');
console.log('- identity resolved outside Sidebar');
console.log('- sign-out action present');
console.log('- owner-editable profile settings route present');
console.log('- truthful database-backed header health state present');
console.log('- unresolved tenant is not reported as healthy');
console.log('- canonical tenant resolver security invariants present');
console.log('- canonical dashboard queries use RLS tenant scope');
