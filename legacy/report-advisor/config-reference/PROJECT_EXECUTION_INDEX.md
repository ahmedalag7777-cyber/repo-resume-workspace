# Report Advisor — Project Execution Index (Legacy Pointer)

> هذا الملف كان الفهرس التنفيذي الأول. تم الآن إنشاء الفهرس الشامل الحالي في:
>
> **`docs/MASTER_EXECUTION_INDEX.md`**
>
> يجب الرجوع إلى الفهرس الشامل أولًا قبل أي تنفيذ جديد. هذا الملف محفوظ كسجل تاريخي للدفعات السابقة والـcommits، وليس مصدر الحالة الوحيد.

## Current master reference

- `docs/MASTER_EXECUTION_INDEX.md` — الحالة الشاملة الحالية، المراحل، المتطلبات، الـCI، الـgaps، الـbacklog وتسلسل التنفيذ.
- `docs/MASTER_EXECUTION_INDEX_ADDENDUM_2026-09-02-DASHBOARD-RUNTIME.md` — أحدث إضافة توثيقية خاصة بإغلاق Dashboard RPC/runtime على exact SHA `ec6eb4cce7803af8e94697adfa6d9308f69a9ee2`.
- `docs/MASTER_EXECUTION_INDEX_ADDENDUM_2026-09-02-PRODUCTION-TARGET-FORENSICS.md` — أحدث إضافة توثيقية لربط Vercel Production بالـruntime artifact وتحديد أن Production Supabase target identity ما زالت UNPROVEN.
- `docs/EVIDENCE/2026-09-02-production-separation-forensics.md` — أحدث forensic evidence يثبت خلل binding بين Production Vercel artifact وStaging Supabase.
- `docs/IMPLEMENTATION_ROADMAP.md` — التسلسل المرحلي الأصلي.
- `docs/MASTER_PRODUCT_REFERENCE.md` — المتطلبات والـguardrails المرجعية.
- `docs/INSPIRATION_IMPLEMENTATION_AUDIT.md` — تدقيق فجوات المنتج/UX.
- `docs/INTEGRATION_SOURCES_REGISTRY.md` — سجل التكاملات والفروع.
- `docs/CI_FAILURE_HUNTING_LEDGER.md` — سجل مشاكل CI التاريخية.

## Historical execution record

### CI topology
- J/K/L runtime wave → manual-only. Commit: `2117ea05bcfda6f9321919c991c3d9e5b9a03371`
- Autonomy safety wave → manual-only. Commit: `86b961b721d3ce17c58d9ada2dae9a9dd5b227cc`
- CI topology guard → `fcbfbaf908c63a193eb8ad852253aabdb880a051`
- Quality topology/recovery integration → `c7a1561fa049a6c89863d1e34816c09bc2ec0c49`
- Production closure → manual-only. Commit: `0f4e1f36a53117516974170268f4d93aaa726ca2`

### Release / provenance / certification
- Security provenance certification → `5edd785f890428f208fe5f05d381394a31fced77`
- Artifact/migration provenance → `17f48ebf6836f8a1cb1e3e592bc309f9d78a22e6`
- Release artifact integrity → `bc2f1f2b96d2dd7d3c023f3e4c55d85dce7e3fb7`
- Rollback contract → `8d27e749549aec79d118a27f3e3b48c250870210`
- Release manifest → `36633c481966257bf782ccd42f18a107608a3953`
- Manifest integrity → `c029b98d1729d62f53431b0db4d0bbd335a65fa0`
- Release drift → `0801e07e43a03955c21e8ad4a61545eabc7ce974`
- Evidence snapshot → `cda2ed0e61e1683ee886a15e8fbc238663614211`
- Evidence freshness → `971c9dde1295cee4070334fa780669e4119d54ea`
- Release decision provenance → `e0d8bd561603d4f648618d2352acfdf247b97991`
- Release audit bundle → `6854a064f490aff284a3fb50fcb18a8d4b3dcfeb`
- Release gate completeness → `94687198491ee9804ad0ff7f4866e5633d460d40`
- Unified production release gate → `2fc36900190b878e36449b966ba4120503d4ba8c`
- Recovery readiness → `e7af4dca612761e6d19e3d24e4e6e29d7589618e`
- Recovery workflow → `be9daad4915f2c9b5082ffb77b5c1dcb974fe66c`
- Production recovery gate → `2f3547b272511847f12a35b5ae686f390566a96e`

## Historical rules retained

- Do not confuse static wiring with runtime PASS.
- Do not announce Production Certified without live evidence.
- Do not create duplicate gates without first checking Quality and existing contracts.
- `main` is the source of truth.
- After every meaningful execution batch, update `docs/MASTER_EXECUTION_INDEX.md` or its explicitly linked append-only addendum when preserving the full historical index verbatim is required.

## Latest Dashboard Runtime Closure

- Exact code SHA: `ec6eb4cce7803af8e94697adfa6d9308f69a9ee2`.
- Quality Run: `33588898048` — PASS.
- Deployment: `dpl_2eucnVguBRL5c2dGTakd5zqEVHB1` — READY / Production.
- Live artifact: `/assets/index-B49eOQQy.js`.
- Production DB: `get_dashboard_snapshot(integer,date)` PRESENT; `get_dashboard_top_entities` ABSENT.
- Authenticated Chrome: `POST /rest/v1/rpc/get_dashboard_snapshot` → HTTP 200.
- Old RPC: `get_dashboard_top_entities` → NO REQUEST.
- Dashboard UI: rendered successfully with canonical KPI/dashboard data.
- Detailed RCA: `docs/RCA_DASHBOARD_TOP_ENTITIES_2026-09-02.md`.
- Mutation record: `docs/MUTATION_RECORD_DASHBOARD_RPC_2026-09-02.md`.
- Evidence pack: `docs/EVIDENCE/2026-09-02-dashboard-rpc-runtime-certification.md`.

## Current Production Separation Forensics

- Forensic evidence commit: `0fefd8b3316d2721ef5afc63d1f94f9c1a256335`.
- Live production artifact `/assets/index-B49eOQQy.js` was fetched read-only and contains Supabase URL `https://fnqbvfuwbdpwvhcgzksl.supabase.co`.
- That URL is the Staging project `Report-Advisor-P0-2-Staging`, not a separately proven Production Supabase target.
- Therefore `Production separation = FAILED / NOT CERTIFIED` for the currently served artifact.
- No production configuration, DB, Auth, RLS, deployment, or infrastructure mutation was performed.
- Recovery candidate `oirazrmpvwwmklqfrdur` is INACTIVE and could not be connected to read-only SQL; it is not a verified recovery target.
- Staging parent remains ACTIVE_HEALTHY with 110 recorded migrations, but target writability remains UNPROVEN.

## Latest Production Target Identity Forensics

- Vercel project `report-advisor` (`prj_jcqgz6UKGd6tPgHZlttgFXaXvyvo`) is confirmed as the Production project serving `report-advisor.vercel.app`.
- Latest observed aliased Production deployment: `dpl_4RLSYao4YqpSoM5qEZ5UX1RhciSf`, READY, target `production`.
- Its build provenance is GitHub `Report-Engainall/Report-Advisor`, `main`, source commit `0fefd8b3316d2721ef5afc63d1f94f9c1a256335`.
- Its served artifact `/assets/index-B49eOQQy.js` resolves to Supabase project `fnqbvfuwbdpwvhcgzksl` (`Report-Advisor-P0-2-Staging`).
- Independent Supabase registry inspection found only that Staging project and an unrelated/inactive project `oirazrmpvwwmklqfrdur`; neither is proven to be the intended Production target.
- Therefore `PRODUCTION TARGET IDENTITY = UNPROVEN / BLOCKED`.
- No Vercel environment variable change, Supabase mutation, Auth/RLS change, credential creation, deployment, restore, rollback, or DR action was performed.

## Next action

**STOP BEFORE PRODUCTION-IMPACTING MUTATION.** The Production target identity is not provable from currently exposed read-only metadata. The next allowed action remains read-only discovery of any additional canonical production-target evidence; otherwise Owner approval is required before correcting the binding. Backup/Restore/RPO/RTO/Rollback/Forward Recovery/DR/Tenant A-B remain independently unproven and must not be inferred from this finding.