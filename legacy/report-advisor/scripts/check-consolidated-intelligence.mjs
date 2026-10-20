import fs from 'node:fs';

const required = [
  'docs/INTEGRATION_SOURCES_REGISTRY.md',
  'docs/MASTER_PRODUCT_REFERENCE.md',
  'src/lib/intelligence/truthPolicy.ts',
  'src/lib/intelligence/processingRouter.ts',
  'src/lib/intelligence/adaptiveProcessingPipeline.ts',
  'src/lib/semanticMetrics.ts',
  'src/lib/metricSSOT.ts',
  'src/lib/universalDataContract.ts',
  'src/lib/universalImportContract.ts',
  'src/lib/documentIntelligenceGateway.ts',
  'src/lib/canonicalIntelligence.ts',
  'src/lib/businessIntelligenceEngines.ts',
  'src/lib/financialDecisionEngines.ts',
  'src/lib/dataQualityTrust.ts',
  'src/lib/dataLineage.ts',
  'src/lib/securityScope.ts',
  'src/lib/tenantContext.ts',
  'src/lib/operationalReadiness.ts',
  'supabase/migrations/20260819200000_import_engine_rpcs.sql',
  'supabase/migrations/20260819203000_import_engine_jobs.sql',
  'supabase/migrations/20260819210000_executive_metrics.sql',
  'supabase/migrations/20260923014833_inventory_demand_liquidity.sql',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing consolidated capability: ${file}`);
const policy = fs.readFileSync('src/lib/intelligence/truthPolicy.ts', 'utf8');
for (const token of ['VERIFIED','QUALIFIED','INSUFFICIENT_DATA','BLOCKED','canDriveDecision']) if (!policy.includes(token)) throw new Error(`Truth policy invariant missing: ${token}`);
const registry = fs.readFileSync('docs/INTEGRATION_SOURCES_REGISTRY.md', 'utf8');
for (const branch of ['agent/intelligence-ui-foundation','feat/production-hardening-v1','integrate/intelligence-foundation-selective','integration/intelligence-foundation','integration/intelligence-selective']) if (!registry.includes(branch)) throw new Error(`Source branch missing from registry: ${branch}`);
console.log(`Consolidated intelligence integration: PASS (${required.length} required artifacts)`);
