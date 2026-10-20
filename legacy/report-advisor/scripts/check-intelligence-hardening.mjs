import { readFileSync } from 'node:fs';
const files=['src/lib/file-engine/schema-hardening.ts','src/lib/import-pipeline/entity-resolution.ts','src/lib/import-pipeline/reconciliation-hardening.ts','src/lib/import-pipeline/governed-route-plan.ts'];
const all=files.map(f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8')).join('\n');
for(const token of ['buildSchemaRelationships','inferHeaderlessSchema','classifyDataset','resolveEntity','deduplicateRows','idempotencyKey','reconcileInvoice','reconcileInventory','approvalDecision','buildGovernedRoutePlan','assertGovernedRoute'])if(!all.includes(token))throw new Error(`Intelligence hardening contract missing: ${token}`);
if(!all.includes("'quarantine'")||!all.includes("'review'"))throw new Error('Review/quarantine dispositions missing');
console.log('A0.3/A0.4/A0.5 intelligence hardening contract: PASS');
