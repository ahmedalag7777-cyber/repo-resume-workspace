export const regressionGates=[
'golden-realistic-fixtures','text-first-extraction-gate','end-to-end-document-pipeline-contract','canonical-text-provenance','extraction-fallback-policy','layout-table-fidelity','extraction-quality-score','resilient-document-decision','evidence-source-trace','golden-e2e-corpus','production-gate-integrity','adversarial-document-corpus','performance-scale-gates','integration-pipeline-simulation'
];
export function validateManifest(){return{valid:regressionGates.length>=14, count:regressionGates.length, unique:new Set(regressionGates).size===regressionGates.length};}
