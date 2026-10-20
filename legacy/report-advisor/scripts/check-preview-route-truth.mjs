import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/pages/ProposalDemoPage.tsx'), 'utf8');

assert.match(app, /const isNetlifyPreview = host\.endsWith\('--aghbari-report-advisor\.netlify\.app'\)/);
assert.match(app, /const isPrimaryPublicPreview = host === 'aghbari-report-advisor\.netlify\.app' \|\| host === 'main--aghbari-report-advisor\.netlify\.app';/);
assert.match(app, /if \(authQuery\) return <AuthGate><AppShell \/><\/AuthGate>;/);
assert.match(app, /const isLandingPath = location\.pathname === '\/' \|\| location\.pathname === '';/);
assert.match(app, /if \(demoQuery \|\| \(isLandingPath && \(isNetlifyPreview \|\| isPrimaryPublicPreview \|\| isGitHubPagesPublicPreview\)\)\) return <ProposalDemoPage \/>;/);
assert.doesNotMatch(app, /if \(demoQuery \|\| isNetlifyPreview \|\| isPrimaryPublicPreview \|\| isGitHubPagesPublicPreview\) return <ProposalDemoPage \/>/, 'PUBLIC_HOST_MUST_NOT_OVERRIDE_PROTECTED_REPORT_ROUTES');

assert.match(page, /function PreviewBusinessSurface\(\{ path \}: \{ path: string \}\)/);
assert.match(page, /function ProposalCommercialDemoPage\(\)/);
assert.match(page, /previewRoute = location\.pathname !== '\/proposal-demo'/);
assert.match(page, /previewRoute\s*\n\s*\? <PreviewBusinessSurface path=\{location\.pathname\}/);
assert.match(page, /function PreviewNavigation\(\{ currentPath \}: \{ currentPath: string \}\)/);
assert.match(page, /اختبار الدخول الحقيقي/);

console.log('PASS preview route truth contract: Netlify previews use the source-backed route-aware surface; /proposal-demo remains the explicit commercial proposal.');
