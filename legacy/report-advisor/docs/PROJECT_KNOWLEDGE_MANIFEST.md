# PROJECT KNOWLEDGE MANIFEST — الأغبري / Report-Advisor
Status: CANONICAL LINEAGE / CONSOLIDATION LEDGER
Authority: inventory and deletion gate only

## 1. Purpose
This manifest prevents information loss while the repository is consolidated. It never becomes a second source of product or engineering truth.

Deletion sequence:
INVENTORIED -> CLASSIFIED -> CONTENT ABSORBED -> REFERENCES CHECKED -> TESTS PASS -> MANIFEST RECORDED -> ARCHIVE/REMOVE

No source is marked REMOVE during an inventory-only pass.

## 2. Canonical owners
| Canonical owner | Domain |
|---|---|
| docs/SYSTEM_HEART.md | control plane / operating law |
| ONE-PROGRAMMER-SESSION-MEMORY.md | live state |
| docs/MASTER_EXECUTION_INDEX.md | progress / execution boundary |
| docs/MASTER_PRODUCT_REFERENCE.md | product / IA / product truth |
| docs/MASTER_UI_UX_REFERENCE.md | UI / UX / surface completeness |
| docs/MASTER_ENGINEERING_ARCHITECTURE.md | technical architecture |
| docs/MASTER_DATA_TRUTH_SECURITY.md | truth / database / tenant / security |
| docs/MASTER_RUNTIME_CERTIFICATION.md | testing / certification / resilience |
| docs/MASTER_COMMERCIAL_REFERENCE.md | value / commercial proof |
| docs/PROJECT_KNOWLEDGE_MANIFEST.md | lineage / consolidation status |

## 3. Source families and owners
### Product / UX
Target: MASTER_PRODUCT_REFERENCE + MASTER_UI_UX_REFERENCE
- docs/MASTER_PRODUCT_REFERENCE.md
- docs/MASTER_PRODUCT_UI_ARCHITECTURE.md
- docs/COMMERCIAL_NAVIGATION_IA_2026-09-18.md
- docs/COMMERCIAL_UI_PRODUCT_SURFACE_MASTER_SPEC_2026-09-18.md
- docs/PRODUCT_EXPERIENCE_PRINCIPLES.md
- docs/ux-product-architecture-master.md
- docs/AGHBARI_GLOBAL_PRODUCT_DESIGN_SYSTEM_2026-09-18.md
- docs/DEVELOPMENT_WAVE_20260918.md

### Engineering / architecture
Target: MASTER_ENGINEERING_ARCHITECTURE
- docs/REPORT_ADVISOR_MASTER_ARCHITECTURE.md
- docs/MASTER_PRODUCT_SPEC_AND_EXECUTION_PROTOCOL.md
- docs/INTERNAL_ENGINEERING_POLICY.md
- docs/REFERENCE_PROTOCOL.md
- docs/PROGRAMMER_AUTONOMOUS_OPERATING_PROTOCOL.md
- docs/ADAPTIVE_EXECUTION_GOVERNANCE.md
- docs/PARALLEL_EXECUTION_COORDINATION_PROTOCOL_2026-09-18.md
- docs/PARALLEL_EXECUTION_PROTOCOL_20260917.md
- docs/EXECUTION_PROTOCOL.md

### Data / truth / security
Target: MASTER_DATA_TRUTH_SECURITY
- docs/MULTI_TENANT_SECURITY.md
- docs/MULTI_TENANT_TEST_MATRIX.md
- docs/metric-contract.md
- docs/INTELLIGENCE_FORMULAS.md
- docs/SECURITY_RELEASE_CHECKLIST.md
- docs/INTEGRATION_AUDIT_2026-08-21.md
- docs/INTEGRATION_SOURCES_REGISTRY.md
- docs/FREE_FIRST_ARCHITECTURE.md
- docs/FREE_FIRST_NO_PAID_FALLBACK_POLICY.md
- docs/FREE_OPEN_SOURCE_TOOLBOX.md
- docs/FREE_TECHNOLOGY_STACK.md

### Import / document intelligence
Target: MASTER_ENGINEERING_ARCHITECTURE + MASTER_UI_UX_REFERENCE
- docs/DOCUMENT_INGESTION_ACCURACY.md
- docs/DOCUMENT_INTELLIGENCE_ENGINE_REQUIREMENTS.md
- docs/OPEN_SOURCE_AI_DOCUMENT_STACK.md
- docs/REPORT_FORMATS_YEMEN_ARAB_ERP.md
- matching scripts and workflows under scripts/ and .github/workflows/

### Runtime / certification / recovery
Target: MASTER_RUNTIME_CERTIFICATION
- docs/MASTER_PRODUCTION_GATE.md
- docs/P0_RUNTIME_CERTIFICATION_MATRIX.md
- docs/RUNTIME_CLOSURE_MATRIX.md
- docs/LIVE_CERTIFICATION_RUNBOOK.md
- docs/PHASE_E_LIVE_CERTIFICATION.md
- docs/PHASE_F_G_EXECUTION_CLOSEOUT.md
- docs/PHASE_H_I_RUNTIME_CLOSEOUT.md
- docs/PHASE_K_L_M_EXECUTION.md
- docs/K_TO_S_PRODUCTION_CLOSURE.md
- docs/VERCEL_DEPLOYMENT_RETENTION.md
- dated runtime evidence under docs/EVIDENCE/, docs/evidence/ and docs/deployment/

### Execution / progress history
Target: MASTER_EXECUTION_INDEX + ONE-PROGRAMMER-SESSION-MEMORY
- PROJECT_EXECUTION_INDEX.md
- docs/EXECUTION_COMMAND_2026.md
- docs/AUTONOMOUS_EXPERT_EXECUTION_STANDARD.md
- docs/CI_EXECUTION_MODE.md
- docs/CI_FAILURE_HUNTING_LEDGER.md
- docs/EXECUTION_DEBT_AND_RELEASE_VELOCITY.md
- docs/EXECUTION_ENFORCEMENT_PROTOCOL.md
- docs/EXECUTION_LEDGER_*.md
- docs/MASTER_EXECUTION_INDEX_ADDENDUM_*.md
- docs/MASTER_EXECUTION_INDEX_APPEND_*.md
- docs/MASTER_EXECUTION_INDEX_CURRENT_*.md
- docs/SESSION_CHECKPOINT_*.md
- docs/EXECUTION_CHECKPOINT_*.md

### Intelligence / decision / analytics
Target: MASTER_PRODUCT_REFERENCE + MASTER_ENGINEERING_ARCHITECTURE
- docs/MARKET_DEMAND_INTELLIGENCE_SPEC.md
- docs/PRODUCT_FAMILY_INTELLIGENCE_SPEC.md
- docs/INTELLIGENCE_UI_FOUNDATION_MIGRATION.md
- docs/PRODUCT_INSPIRATION_MATRIX.md
- docs/MUTATION_RECORD_DASHBOARD_RPC_2026-09-02.md
- docs/RCA_DASHBOARD_TOP_ENTITIES_2026-09-02.md

### Requirements / roadmap / acceptance
Target: MASTER_PRODUCT_REFERENCE + MASTER_EXECUTION_INDEX
- docs/IMPLEMENTATION_ROADMAP.md
- docs/IMPLEMENTATION_ROADMAP_PHASES_N-S.md
- docs/MASTER_ACCEPTANCE_MATRIX_TEMPLATE.md
- docs/MASTER_REQUIREMENTS_COVERAGE_2026-08-22.md
- docs/MASTER_REQUIREMENTS_TRACEABILITY.md
- docs/MASTER_SYSTEM_INVENTORY_2026-08-25.md
- docs/MIGRATION_EXECUTION_MAP_2026-08-25.md
- docs/UPDATED-WORK-ROADMAP.md
- docs/final-spec-implementation-baseline.md
- docs/final-spec-addendum-inventory-liquidity-demand-cashflow.md
- docs/production-hardening-plan.md
- docs/system-forensic-audit.md

### Commercial / GTM
Target: MASTER_COMMERCIAL_REFERENCE
- docs/PRODUCTIZATION_AND_GO_TO_MARKET.md
- commercial UI/proposal/demo specifications
- external-project knowledge addenda when still relevant

## 4. Historical evidence is not duplicate product truth
Dated forensic evidence, exact-run artifacts, migration records, production snapshots and adversarial ledgers may remain historical because timestamp and immutable context are evidence. They are referenced from canonical masters, not used as product definitions.

## 5. Executable source is not copied into prose
Executable truth remains in:
src/, services/, api/, netlify/, supabase/, scripts/, .github/workflows/, tests/

The Manifest records what execution surfaces prove or protect; it does not duplicate their entire source.

## 6. Mandatory migration record
For every source selected for consolidation record:
- source path
- source SHA
- target owner
- unique rules extracted
- references/dependencies inspected
- tests/checks run
- unresolved conflicts
- final disposition
- absorption date/SHA

## 7. Deletion gate
A source may be physically deleted only when all are true:
- no unabsorbed unique content
- references/callers inspected
- no workflow/test dependency
- canonical owner contains the durable rule
- historical evidence retained when needed
- relevant checks pass
- deletion itself is a reviewed repository change

Otherwise status remains RETAIN.

## 8. First consolidation wave
1. PROGRAMMER_AUTONOMOUS_OPERATING_PROTOCOL -> SYSTEM_HEART
2. PROJECT_EXECUTION_INDEX -> MASTER_EXECUTION_INDEX pointer cleanup
3. REPORT_ADVISOR_MASTER_ARCHITECTURE -> MASTER_ENGINEERING_ARCHITECTURE
4. MASTER_PRODUCT_UI_ARCHITECTURE + UI/design-system specs -> MASTER_UI_UX_REFERENCE
5. runtime matrices/runbooks -> MASTER_RUNTIME_CERTIFICATION
6. tenant/security/data contracts -> MASTER_DATA_TRUTH_SECURITY
7. GTM/productization -> MASTER_COMMERCIAL_REFERENCE

Do not delete these sources in wave 1. Absorb, verify, then archive/remove in later gated waves.

## 9. Current consolidation status
CONTROL_PLANE_ESTABLISHED / CONTENT_MIGRATION_PENDING

The repository now has a canonical destination for each major knowledge class. The next work is content absorption and proof, not creation of additional competing master files.

## 10. Verified first-wave absorption records

### Programmer operating protocol
- Source: docs/PROGRAMMER_AUTONOMOUS_OPERATING_PROTOCOL.md
- Source SHA observed: 8d6d8d8c354fb7ea992b461b1fdfe9842ccc23a5
- Target: docs/SYSTEM_HEART.md
- Absorbed: exact-head evidence law, fail-closed policy, production mutation safety, test sequencing, blocker-local/session-global behavior, anti-gaming rules, documentation-as-implementation.
- Status: ABSORBED / SOURCE RETAINED

### Report-Advisor master architecture
- Source: docs/REPORT_ADVISOR_MASTER_ARCHITECTURE.md
- Source SHA observed: 116508a0d1280a8ddd9881363cff6345ae0c1ccc3
- Target: docs/MASTER_ENGINEERING_ARCHITECTURE.md
- Absorbed: BI capability model, inventory/demand/liquidity references, semantic metric governance, event/decision chain, agent governance, research workflow, Report Studio, deterministic data-engine transformations, scaling discipline.
- Status: ABSORBED / SOURCE RETAINED

### Product UI architecture
- Source: docs/MASTER_PRODUCT_UI_ARCHITECTURE.md
- Source SHA observed: f6ddfb2080ce919a61e19e218e922956a587e688
- Target: docs/MASTER_UI_UX_REFERENCE.md
- Absorbed: canonical IA distinctions, Advisor placement rules, visual system, hard exclusions and canonical technical paths; expanded with interaction/state completeness.
- Status: ABSORBED / SOURCE RETAINED

### Global design system
- Source: docs/AGHBARI_GLOBAL_PRODUCT_DESIGN_SYSTEM_2026-09-18.md
- Source SHA observed: 27ada5485ddeff1768092d40b1327d6f99c21142
- Target: docs/MASTER_UI_UX_REFERENCE.md
- Absorbed: business-first hierarchy, density defaults, navigation, overlay semantics, reporting/print rules, accessibility gate.
- Status: ABSORBED / SOURCE RETAINED

## 11. Current deletion decision
No source above is authorized for deletion yet.

Reason: absorption into canonical files is demonstrated for the reviewed source content, but repository-wide reference/caller checks and affected contract verification must still be completed before archive/remove. Historical evidence must remain retained where it has evidentiary value.

## 12. Consolidation wave control
Do not start a deletion wave until:
1. all source families selected for that wave are mapped;
2. unique content extraction is complete;
3. repository references/callers are checked;
4. affected contracts/tests pass;
5. canonical owner is re-read at the resulting SHA;
6. Manifest status is updated from ABSORBED to ARCHIVE-READY;
7. only then may a separate deletion commit be created.
