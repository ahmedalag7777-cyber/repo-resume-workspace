# Report-Advisor — Owner-Level Autonomous Completion Plan

**Date:** 2026-09-01  
**Authority:** Owner-level execution plan  
**Repository:** `Report-Engainall/Report-Advisor`  
**Purpose:** تحويل المشروع من حالة "بُني واختُبر جزئيًا" إلى منتج نهائي قابل للإطلاق، مع استغلال عمل المبرمج بالتوازي ومنع إعادة البحث والتصفح والتقارير غير الضرورية.

---

## 0. NON-NEGOTIABLE EXECUTION RULE

هذه الوثيقة هي خطة تنفيذ وليست تقريرًا دوريًا.

القاعدة:

`EXECUTE > TEST > FIX > VERIFY > RECORD`

وليس:

`SEARCH > READ > REPORT > ASK > WAIT`

### ممنوع تكرار العمل التالي إلا إذا ظهرت إشارة فشل جديدة
- إعادة استعراض المشروع كاملًا بلا سبب.
- إعادة شرح ما تم إنجازه في الرسائل.
- إعادة اكتشاف تاريخ المشروع المثبت في `MASTER_EXECUTION_INDEX`.
- كتابة تقرير طويل بدل تنفيذ مهمة قابلة للتنفيذ.
- إعادة اختبار إصلاح قديم على HEAD قديم.
- ترقية PASS تاريخي إلى HEAD جديد.

### مسموح فقط
- البحث الموجه عندما تكون هناك فجوة أو تناقض.
- اختبار جديد مرتبط بـ exact HEAD.
- إصلاح root cause.
- دمج إصلاح مكتمل.
- إنشاء evidence جديد مربوط بالـ SHA.
- فتح جبهة موازية لا تعتمد على الجبهة الأخرى.

---

# 1. CURRENT AUTHORITATIVE REALITY

حتى وقت إنشاء هذه الخطة:

- `main` الحالي: `a3c4e22b410482fdd2ddf73eb125cf9f51586a96`.
- Production certification: **NO**.
- Runtime/live certification: **NOT PROVEN**.
- توجد PRs حديثة مفتوحة يجب التعامل معها كعمل pending وليس كجزء من main.
- PR #291: metric confidence/source-evidence hardening — **لا يدمج قبل إصلاح ملاحظات correctness**.
- PR #292: AI tenant-scope hardening — **لا يدمج قبل إغلاق null/invalid tenant fail-closed edge case**.
- PR #293: metric/evidence hardening — **مراجعة ثم CI ثم merge إذا اجتاز الشروط**.
- Vercel deployment verification متأثر حاليًا بـ deployment quota.
- `desktop/package.json` في `main` ما زال على Electron 37.x؛ Electron 44 remediation يجب ألا تعتبر منجزة في `main` حتى يتم دمجها وإثباتها على نفس SHA.
- `vercel.json` موجود ويحتوي SPA fallback، لكن ذلك لا يثبت runtime حتى يُنشر exact HEAD ويُختبر مباشرة.

**قاعدة:** لا يتم إعلان اكتمال أي بند بسبب وجود كود أو PR فقط؛ الإغلاق يعتمد على مستوى الدليل المطلوب.

---

# 2. EXECUTION MODEL — MAXIMUM PARALLELISM

المبرمج يعمل على الجبهات المستقلة بالتوازي، ولا ينتظر جبهة لا يحتاجها.

## Lane A — Merge/Correctness Closure
**Owner:** Principal Engineer

### Tasks
1. إصلاح PR #291.
2. إصلاح PR #292.
3. مراجعة PR #293.
4. تشغيل targeted tests.
5. تشغيل full quality على كل branch.
6. دمج فقط ما يثبت سلامته.
7. بعد كل merge: تسجيل SHA الجديد وإلغاء صلاحية PASS السابق له.

**Dependency:** لا يعتمد على Vercel أو Supabase runtime.

---

## Lane B — Canonical Truth / BI
**Owner:** Data/BI Engineer

### Tasks
1. إنهاء graph لـ `queries-compat.ts`.
2. إثبات zero business-truth ownership خارج canonical query boundaries.
3. فحص NULL / UNKNOWN / INSUFFICIENT_DATA / UNAVAILABLE.
4. فحص date/status/as-of semantics.
5. إثبات equivalence بين:
   - dashboard
   - analytics
   - reports
   - exports
   - canonical RPCs
6. فحص Forecast / Demand Velocity / Inventory Intelligence.
7. بناء golden business expectations.
8. إضافة regression contracts لأي discrepancy.

**Dependency:** يمكن تنفيذه بالتوازي مع Lane A.

---

## Lane C — Security / Tenant / Authorization
**Owner:** Security + DB Engineer

### Tasks
1. RPC grants.
2. `SECURITY DEFINER` review.
3. `search_path` review.
4. RLS review.
5. caller-by-caller privileged RPC authorization.
6. authenticated tenant A/B adversarial tests.
7. Storage bucket/path isolation.
8. signed URL isolation.
9. Realtime channel isolation.
10. AI/vector namespace isolation.
11. negative authorization tests.
12. workers/notifications/generated-files tenant boundaries.

**Dependency:** static/security work مستقل عن Vercel؛ live A/B يحتاج environment credentials/data.

---

## Lane D — Document Intelligence / OCR
**Owner:** Document Intelligence Engineer

### Tasks
1. إنشاء Golden Corpus صغير ومحدد وثابت.
2. PDF text extraction.
3. scanned PDF Arabic.
4. scanned PDF English.
5. DOCX.
6. image OCR.
7. corrupted/invalid document cases.
8. page/dimension limits.
9. confidence behavior.
10. evidence lineage.
11. source fingerprint/hash.
12. deterministic expected outputs.
13. fail-closed cases.
14. record corpus result against exact SHA.

**Dependency:** repository tests الآن؛ live corpus execution يمكن أن يعمل بالتوازي.

---

## Lane E — Desktop / Windows
**Owner:** Desktop Engineer

### Tasks
1. نقل Electron remediation المقبولة إلى current main release path.
2. تثبيت الإصدار النهائي المعتمد من Electron.
3. `npm audit`.
4. Windows native smoke.
5. watched-folder fixture.
6. recursive watcher.
7. restart persistence.
8. duplicate event/idempotency.
9. error/recovery.
10. NSIS installer.
11. install/uninstall.
12. artifact hash.
13. exact SHA evidence.

**Dependency:** Windows machine/runtime فقط؛ مستقل عن Vercel.

---

## Lane F — Reliability / Workers / Queue
**Owner:** Reliability Engineer

### Tasks
1. worker startup.
2. worker crash.
3. retry.
4. idempotency.
5. duplicate delivery.
6. DLQ.
7. recovery.
8. partial failure.
9. timeout.
10. restart.
11. generated file recovery.
12. notification recovery.
13. measured recovery evidence.

**Dependency:** live runtime environment where applicable.

---

## Lane G — Performance / Scale
**Owner:** Performance Engineer

### Tasks
1. unbounded query scan.
2. query plans.
3. indexes.
4. N+1.
5. payload limits.
6. pagination.
7. import history limits.
8. report/export limits.
9. representative corpus load.
10. latency baseline.
11. concurrency baseline.
12. regression thresholds.

**Dependency:** static review الآن، real corpus load لاحقًا.

---

## Lane H — Vercel / Production Runtime
**Owner:** Release Engineer

### Tasks — بعد انتهاء Vercel quota
1. deploy current exact `main` SHA.
2. verify deployment SHA binding.
3. `/`.
4. `/login`.
5. representative deep routes.
6. lazy chunks.
7. browser console.
8. network requests.
9. authentication.
10. session persistence.
11. Supabase connectivity.
12. error/loading/empty states.
13. responsive/RTL sweep.
14. capture evidence.

**Hard rule:** READY deployment is not runtime PASS.

---

## Lane I — Backup / DR / Operations
**Owner:** Operations Engineer

### Tasks
1. backup verification.
2. restore drill.
3. measured RPO.
4. measured RTO.
5. telemetry.
6. production alerts.
7. trigger an alert intentionally.
8. verify alert delivery.
9. canary.
10. rollback.
11. verify rollback artifact/DB compatibility.

**Dependency:** production/staging environment access.

---

## Lane J — Product / UX / Business Acceptance
**Owner:** Product QA

### Tasks
1. authenticated end-to-end journey.
2. import → processing → evidence → report.
3. dashboard.
4. analytics.
5. inventory.
6. customers/products.
7. reports/export.
8. intelligence/recommendations.
9. decision/work-item/outcome loop.
10. AI flow.
11. document flow.
12. Arabic RTL.
13. responsive desktop/tablet/mobile.
14. accessibility basics.
15. error states.
16. empty states.
17. merchant acceptance against golden scenarios.

**Dependency:** current deployment + seeded business corpus.

---

# 3. DEPENDENCY GRAPH

```text
                    ┌───────────────┐
                    │ Lane A Merge  │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Exact HEAD CI │
                    └───────┬───────┘
                            │
            ┌───────────────┼────────────────┐
            ▼               ▼                ▼
       Vercel Runtime   DB/Runtime       Desktop
            │               │                │
            └───────┬───────┴────────┬───────┘
                    ▼                ▼
              Authenticated      Real Corpus
                  E2E                 │
                    └────────┬────────┘
                             ▼
                   Cross-surface Truth
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
          Security        Reliability      Performance
             └───────────────┼───────────────┘
                             ▼
                     Business Acceptance
                             │
                             ▼
                      Canary / Rollback
                             │
                             ▼
                  FINAL CERTIFICATION
```

Lanes B–G يجب ألا تنتظر runtime إذا كان يمكن إنجازها static/contractually الآن.

---

# 4. EXACT-HEAD RULE

كل Release Candidate له SHA واحد فقط.

عند تغير SHA:

```text
OLD PASS = HISTORICAL
NEW SHA = UNVERIFIED
```

ولا يجوز نسخ:
- CI PASS
- security PASS
- runtime PASS
- production PASS

من SHA سابق إلى SHA جديد.

---

# 5. PR GATING RULES

## PR #291
**Action:** إصلاح قبل الدمج.

Required:
- confidence invalid input behavior must be intentional and fail-closed.
- sourceRows invalid values must reject safely.
- tests must assert the intended production behavior.
- CI must execute the actual production logic.
- no scanner-only contract.

## PR #292
**Action:** إصلاح قبل الدمج.

Required:
- null/undefined/non-string tenant input must fail closed.
- no `.trim()` call before type/validity guard.
- session tenant must remain authoritative.
- contract must execute actual policy logic.

## PR #293
**Action:** review → test → merge only if clean.

Required:
- no credential/permission overreach.
- exact-head CI.
- all review blockers resolved.

---

# 6. VERCEL QUOTA RESPONSE

Current deployment quota failure is treated as an **external platform blocker**, not as permission to stop engineering.

While quota is blocked:

- complete Lanes A–G static/contract work;
- build golden corpus;
- prepare runtime scripts;
- prepare exact-head evidence commands;
- finish Desktop Windows work;
- finish DB/security static verification;
- do not repeatedly trigger failed deployments;
- when quota resets, deploy once from the authoritative SHA and verify comprehensively.

---

# 7. SUPABASE ACCESS RULE

The project has a known project reference from historical execution, but the currently connected Supabase tool must not be treated as evidence unless it can actually read the project.

If access is restored:

1. read project status;
2. inspect migration ledger;
3. compare repository migrations to live schema;
4. run security advisors;
5. inspect RLS/grants/search_path;
6. execute A/B runtime tests;
7. record exact evidence.

Never claim live Supabase PASS from historical records alone.

---

# 8. GOLDEN CORPUS PROGRAM

Create a deterministic test dataset containing at minimum:

### Tenant A
- customers
- products
- suppliers
- sales invoices
- sales items
- purchase invoices
- purchase items
- inventory movements
- payments
- recommendations
- alerts
- decisions
- work items
- outcomes
- documents

### Tenant B
A deliberately different dataset with overlapping identifiers/names where safe, to expose cross-tenant leakage.

### Expected truth
Precompute expected:
- sales totals
- purchase totals
- gross profit
- inventory valuation
- receivables
- aging
- RFM
- ABC
- demand velocity
- forecast inputs
- recommendation evidence
- report totals
- export totals

Then verify:

`RPC == UI == REPORT == EXPORT == EXPECTED TRUTH`

Any mismatch creates a new defect; it is not a documentation issue.

---

# 9. FINAL RELEASE GATE

Production Certification is allowed only if all are true on ONE exact SHA:

```text
[ ] build PASS
[ ] typecheck PASS
[ ] lint PASS
[ ] full quality PASS
[ ] architecture contracts PASS
[ ] canonical truth contracts PASS
[ ] security contracts PASS
[ ] tenant isolation PASS
[ ] Storage isolation PASS
[ ] Realtime isolation PASS
[ ] AI/vector isolation PASS
[ ] document/OCR golden corpus PASS
[ ] business golden corpus PASS
[ ] UI/report/export equality PASS
[ ] authenticated E2E PASS
[ ] Vercel deployment SHA binding PASS
[ ] deep routes PASS
[ ] Windows native smoke PASS
[ ] installer PASS
[ ] worker recovery PASS
[ ] DLQ PASS
[ ] performance/load PASS
[ ] backup restore PASS
[ ] RPO/RTO measured PASS
[ ] telemetry PASS
[ ] alert trigger PASS
[ ] canary PASS
[ ] rollback PASS
[ ] final UX/RTL/accessibility PASS
[ ] independent business acceptance PASS
[ ] evidence ledger complete
[ ] MASTER_EXECUTION_INDEX updated
```

Only then:

`PRODUCTION CERTIFIED = YES`

---

# 10. DEFINITION OF DONE

The project is not "done" because:
- all PRs are merged;
- CI is green;
- Vercel says READY;
- tests exist;
- screenshots look good;
- CodeRabbit says approve.

It is done only when the same exact SHA is:

`BUILT → INTEGRATED → VERIFIED → RUNTIME PROVEN → PRODUCTION CERTIFIED`

with evidence at every transition.

---

# 11. COMMUNICATION PROTOCOL FOR THE PROGRAMMER

Every execution cycle should return only:

```text
EXECUTED:
- concrete changes

VERIFIED:
- exact tests/checks

SHA:
- exact commit SHA

BLOCKED:
- only genuine external blockers

NEXT PARALLEL:
- 3–7 executable tasks
```

Do not return a long re-audit unless a new contradiction is found.

Do not ask the owner to repeat information already present in this repository.

Do not wait for owner approval for ordinary engineering choices that are already governed by this plan.

Escalate only for:
- destructive production operations;
- irreversible data deletion;
- paid resource creation;
- credentials/secrets that cannot be obtained through existing authorized channels;
- business decisions not inferable from existing product requirements.

---

# 12. OWNER-LEVEL PRIORITY ORDER

If engineering capacity is limited, execute in this order:

1. **Correctness/security blockers in open PRs (#291/#292/#293).**
2. **Exact-head CI and merge closure.**
3. **Canonical business truth + golden corpus.**
4. **Tenant A/B + Storage/Realtime/AI isolation.**
5. **Vercel exact-head runtime.**
6. **Authenticated E2E.**
7. **Windows/Desktop final proof.**
8. **Workers/recovery/DLQ.**
9. **Performance/load/query plans.**
10. **Backup/restore/RPO/RTO.**
11. **Telemetry/alerts.**
12. **Canary/rollback.**
13. **UX/business acceptance.**
14. **Final certification.**

Parallelism is mandatory whenever two tasks do not share a dependency.

---

# 13. CURRENT STOP/GO MATRIX

| Area | State | Can execute now? | Exit evidence |
|---|---|---:|---|
| PR #291 | 🔴 fix required | YES | corrected tests + CI |
| PR #292 | 🔴 fix required | YES | corrected tests + CI |
| PR #293 | 🟠 review pending | YES | review + CI |
| Canonical BI | 🟡 | YES | golden equivalence |
| Security static | 🟡 | YES | exact-head security evidence |
| Security live | 🟠 | YES if env available | A/B adversarial evidence |
| OCR | 🟡 | YES | golden corpus |
| Desktop | 🟡 | YES on Windows | native + installer evidence |
| Vercel | 🔴 external quota | WAIT for quota; prepare everything else | exact SHA deployment + runtime |
| E2E | 🟠 | after deployment/data | authenticated evidence |
| Reliability | 🟡 | YES | crash/recovery/DLQ evidence |
| Performance | 🟡 | YES | real corpus/load evidence |
| DR | 🟠 | if environment permits | restore + RPO/RTO |
| Canary | 🟠 | after deploy | canary + rollback |
| Business acceptance | ⚫ | after golden/live | independent acceptance |
| Certification | 🔴 | NO | all final gates |

---

# 14. FINAL OWNER DIRECTIVE

**Do not optimize for the number of reports produced. Optimize for the number of release blockers removed.**

The programmer is authorized to execute all non-destructive work represented here without waiting for another owner message.

When a blocker is external, continue every independent lane.

When a defect is discovered, fix the root cause and add the smallest executable regression proving it cannot return.

When a fix is merged, immediately continue with the next parallel lane.

When a SHA changes, re-bind all required evidence to the new SHA.

The final objective is not a beautiful status report.

The objective is:

**`REPORT-ADVISOR = REAL, SECURE, VERIFIED, RUNTIME-PROVEN, PRODUCTION-CERTIFIED PRODUCT.`**

**PRODUCTION CERTIFIED = NO until every mandatory live gate is evidenced on the same exact release SHA.**
