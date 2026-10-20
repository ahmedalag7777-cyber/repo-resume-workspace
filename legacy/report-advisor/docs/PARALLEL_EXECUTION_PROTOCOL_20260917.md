# REPORT-ADVISOR — PARALLEL EXECUTION PROTOCOL

**Effective:** 2026-09-17
**Purpose:** Enable concurrent owner-level execution by the external programmer and ChatGPT without file, SHA, certification, deployment, or evidence conflicts.

## 1. Authority

- Certification frozen SHA: `2313dc50d5de6a8f53ca6aae447a97de7a69e17b`
- Master status: GitHub Issue #478
- Commercial/product roadmap: Issue #472
- This protocol governs parallel ownership only; it does not itself change runtime behavior.

## 2. Ownership split

### Programmer — EXECUTION OWNER

The programmer owns all repository implementation and mutable engineering execution:

1. Core/RC certification closure on the certification branch/SHA family.
2. First-failure diagnosis and code/test/governance fixes required for certification.
3. GitHub Actions execution and CI evidence.
4. Production/Vercel deployment execution when available.
5. Production smoke and exact deployment/SHA verification.
6. Application runtime implementation: routes, components, services, RPC usage, migrations when genuinely required, tests, build fixes, persistence paths, browser E2E and related source changes.
7. Final commit/branch/PR integration and exact-SHA evidence binding.

The programmer must not wait for ChatGPT when a task is independently executable.

### ChatGPT — CONTROL / ARCHITECTURE / VERIFICATION OWNER

ChatGPT owns the following parallel fronts:

1. Maintain the master execution protocol and dependency map.
2. Continuously inspect GitHub state, PRs, commits, issues, evidence ledgers and changed files.
3. Review programmer progress against the protocol and identify the next independent action or first real blocker.
4. Validate architectural consistency: reuse existing engines/RPCs, preserve Evidence-First truth, exact-SHA binding, RLS/tenant isolation and fail-closed behavior.
5. Define/maintain the product UX architecture and acceptance contract for the full commercial application.
6. Review the UI/Product development slices against the documented product requirements and the reference-image intent (visual inspiration only, not copying).
7. Inspect Vercel state, deployment identity, deployment SHA, deployment health and external blockers.
8. Maintain risk/blocker classification and prevent duplicated effort or conflicting file ownership.
9. Review completed work and produce verification requests/acceptance criteria before a front is considered closed.
10. Maintain synchronized status in GitHub so the programmer can read current ownership, blockers and acceptance state.

ChatGPT does **not** rewrite programmer-owned implementation files unless explicit ownership is transferred in GitHub before the change.

## 3. Shared rule — no conflicting writes

A file/path has one active owner at a time.

- Programmer-owned source/test/config paths are not edited by ChatGPT.
- ChatGPT-owned documentation/control files are not edited concurrently by the programmer unless ownership is explicitly transferred.
- Any transfer must be recorded in GitHub before the write.
- No concurrent writes to the same file.
- No cherry-picking or rebasing that silently invalidates the other owner's active work.

## 4. Branch / SHA isolation

### Certification lane

`2313dc50...` remains frozen for certification evidence until the certification work itself produces a legitimately new exact-SHA candidate.

Do not merge unrelated product/UI work into this lane.

### Product lane

All broad UI/product work runs on a separate development branch/PR family.

Product work may evolve continuously without waiting for Vercel certification.

## 5. Required synchronization record

For every material change, the programmer updates the relevant PR/Issue with:

- current SHA;
- branch;
- front name;
- files changed;
- tests/evidence executed;
- PASS/FAIL/NOT PROVEN;
- external blocker if any;
- next independent action.

ChatGPT reads the current GitHub state before issuing a new ownership decision.

## 6. Status vocabulary

- **GREEN / CLOSED:** implemented and independently evidenced.
- **YELLOW / ACTIVE:** work in progress or externally blocked, but actionable work continues elsewhere.
- **RED / BLOCKED:** cannot advance without a specific dependency or correction.
- **NOT PROVEN:** implementation may exist but required evidence is missing.

No `PASS` claim without appropriate exact-SHA evidence.

## 7. Parallel fronts

### Programmer fronts

A. Final Certification / Boundary / Execution Enforcement.
B. First-failure remediation.
C. CI evidence.
D. Vercel deployment and Production Smoke when available.
E. Full product implementation on the product branch.
F. Functional/persistence/browser testing of implemented slices.

### ChatGPT fronts

G. Architecture/control-plane verification.
H. GitHub evidence and dependency monitoring.
I. Product UX/IA acceptance definition and review.
J. Vercel state/deployment verification.
K. Cross-front conflict detection and ownership control.
L. Documentation/status synchronization.

## 8. First-failure rule

For certification or release validation:

`Observe → isolate First Failure → diagnose root cause → fix → test → verify → commit → rebind evidence → continue.`

Do not launch broad unrelated audits or bulk reruns.

## 9. Resource conservation

Preserve:

- GitHub Actions capacity;
- Vercel deployment capacity;
- Supabase/database capacity;
- storage/artifact space;
- CI execution time.

Do not repeat checks unless SHA, environment, source, or relevant dependency changed.

## 10. Definition of done for a shared front

A front is closed only when:

1. implementation is present;
2. relevant runtime/business path is proven where applicable;
3. tests are green at the required level;
4. exact SHA is recorded;
5. evidence is stored/linked;
6. no unresolved blocker remains for that front;
7. ownership is marked CLOSED in GitHub.

## 11. Stop / escalation conditions

Escalate only when:

- required credentials/access are unavailable;
- an external control-plane restriction prevents the action;
- a shared file ownership conflict cannot be resolved safely;
- deployment capacity is externally rate-limited;
- a destructive or security-sensitive action would otherwise be required.

Do not stop merely because another front is waiting.

## 12. Product development acceptance order

Product work proceeds independently in this sequence:

1. Application Shell + design system.
2. Dashboard / Command Center.
3. Work Center + Import / Data Quality.
4. Reports + Intelligence / Decision Experience.
5. Inventory + Demand.
6. Receivables + Profitability + RFM / ABC / Aging.
7. Customers + Products + settings/tenant UX.
8. Responsive/mobile/PWA/low-bandwidth/accessibility.
9. Visual + functional + persistence + evidence regression.
10. Commercial expansion from Issue #472.

## 13. Core principles

- Evidence over assertion.
- Exact SHA over historical PASS.
- Real persistence over UI-only success.
- Deterministic metrics over LLM arithmetic.
- Fail-closed over optimistic fallback.
- Reuse over duplicate engines.
- Parallel execution over idle waiting.
- Minimal necessary changes over speculative refactors.
- Product truth over visual decoration.

## 14. Immediate operating mode

No broad execution begins from this document alone until the user explicitly starts the parallel execution phase.

Once started:

- Programmer executes programmer-owned fronts immediately.
- ChatGPT executes ChatGPT-owned control/verification fronts immediately.
- Both synchronize through GitHub Issues/PRs and exact SHA references.
- Neither edits the other's active files without explicit ownership transfer.
