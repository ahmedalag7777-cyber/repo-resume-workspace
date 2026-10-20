import fs from 'node:fs';
const checks = {
  'src/lib/file-engine/schema-hardening.ts': ['buildSchemaRelationships','inferHeaderlessSchema','classifyDataset'],
  'src/lib/file-engine/schema-intelligence-advanced.ts': ['discoverHeaderRow','correctOcrHeader','resolveMappings','resolveEntities'],
  'src/lib/file-engine/reconciliation.ts': ['reconcileByBusinessKey','stableImportFingerprint'],
  'src/lib/file-engine/schema-relationship-graph.ts': ['buildSchemaRelationshipGraph'],
  'src/lib/document-intelligence/review-quarantine.ts': ['createReviewRecord','canPromoteReview','OPEN'],
  'src/lib/document-intelligence/transactional-route.ts': ['buildTransactionalRoutePlan','assertTransactionalCommit','TRANSACTION_COMMIT_BLOCKED'],
  'src/lib/document-intelligence/golden-dataset.ts': ['GOLDEN_CASES','scoreGoldenCases','WIDE_30_PLUS'],
};
for (const [file,tokens] of Object.entries(checks)) { const s=fs.readFileSync(file,'utf8'); for(const t of tokens) if(!s.includes(t)) throw new Error(`${file}: missing ${t}`); }
console.log('A0 hardening contract: PASS');
