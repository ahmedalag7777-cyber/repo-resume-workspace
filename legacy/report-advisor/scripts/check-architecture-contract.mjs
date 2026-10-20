import {readFile} from 'node:fs/promises';
const required=[
 ['src/lib/free-toolbox/tenant-guard.ts',['assertTenantContext','assertTenantOwnership','scopeRecords']],
 ['src/lib/free-toolbox/tenant-cache.ts',['tenantCacheKey','isTenantCacheKey']],
 ['src/lib/free-toolbox/tenant-analysis-cache.ts',['TenantAnalysisCache']],
 ['src/lib/free-toolbox/chunking.ts',['chunk','forEachChunk']],
 ['src/lib/free-toolbox/analysis-cache-policy.ts',['evaluateCacheFreshness','cacheVersionMatches']],
 ['src/lib/free-toolbox/analysis-cache-coordinator.ts',['runCachedAnalysis']],
 ['src/lib/free-toolbox/analysis-invalidation.ts',['invalidates','invalidationReason']],
 ['src/lib/free-toolbox/concurrent-analysis.ts',['ConcurrentAnalysisRegistry']],
 ['src/lib/free-toolbox/tenant-scheduler.ts',['tenantJobKey','canRunTenantJob','scopeTenantJobs']],
 ['src/lib/free-toolbox/tenant-report.ts',['tenantReport','canAccessTenant']],
 ['src/lib/free-toolbox/licensing.ts',['trialLicense','resolvePlan','entitlements','assertFeature']],
 ['src/lib/free-toolbox/usage-meter.ts',['recordUsage','summarizeUsage']],
 ['src/lib/free-toolbox/trial-engagement.ts',['engagementScore']],
 ['src/lib/free-toolbox/data-quality-gate.ts',['evaluateQuality']],
 ['src/lib/free-toolbox/performance-budget.ts',['DEFAULT_PERFORMANCE_BUDGET','evaluatePerformance']],
];
const failures=[];
for(const [path,symbols] of required){try{const text=await readFile(path,'utf8');for(const symbol of symbols)if(!new RegExp(`\\b${symbol}\\b`).test(text))failures.push(`${path}: missing ${symbol}`)}catch{failures.push(`${path}: missing file`)}}
const workflow=await readFile('.github/workflows/quality.yml','utf8');
for(const command of ['npm run typecheck','npm run lint','npm run build','npm run perf:budget','npm run test:production-scale','npm run test:concurrent-analysis'])if(!workflow.includes(command))failures.push(`quality workflow missing ${command}`);
if(failures.length){console.error('Architecture contract FAILED');for(const failure of failures)console.error(`- ${failure}`);process.exit(1)}
console.log(`Architecture contract passed: ${required.length} core modules and concurrency/scale CI gates verified.`);
