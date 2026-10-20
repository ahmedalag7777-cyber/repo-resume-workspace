# PC01 Device Verification — 2026-09-18

## Scope

Real Windows device verification for the Report-Advisor desktop/native execution surface.

- Device: `PC01`
- Repository: `C:\Users\جوجو\Report-Advisor`
- Local branch: `fix/real-business-e2e-review-selector`
- Local exact SHA: `1aca9634b6b19a13b8124be9522bbc543d4cc5ce`
- Local `origin/main`: `a32fae0fc08c1cbbcc60b6eedfb0f4bd74a21c50`
- Verification date: 2026-09-18

## Proven on the connected device

### Web application build

`npm.cmd run build` — **PASS**

- Vite build completed successfully.
- 2,795 modules transformed.
- Build completed in 9.65s.
- Warnings were non-fatal: outdated Browserslist data and an existing Bluebird `eval` warning.

### Desktop Windows packaging

`npm.cmd run package:win` — **PASS**

- electron-builder 26.15.3
- Electron 44.0.0
- Windows x64 NSIS target
- Installer produced:
  `desktop/release/Report-Advisor-Setup-0.1.0.exe`
- Size: 110,776,621 bytes
- SHA-256: `2FB65BBF5D513B071FDB01178E05E1434EBF40AA4E11AF3036951987C1EB2E1D`

### Current-main local contract checks

The following checks passed on the connected device:

- `test:execution-enforcement`
- `test:folder-watch-platform-contract`
- `test:cross-platform-folder-capability`
- `test:operational-file-pipeline`
- `test:document-resilience`

### Native Electron smoke

A first smoke attempt used the normal desktop user-data profile and did not produce a terminal result because an existing Electron instance was present. That attempt was not treated as evidence.

A second run used an isolated Electron user-data directory plus redirected stdout/stderr. It completed with:

`{"nativeSmoke":"PASS","rootPersistence":true,"fileEvent":true,"nativeFsWatchEvents":30,"duplicateSuppressed":true,"changedFileEvent":true,"partialFileStabilized":true,"rapidFilesDetected":5,"traversalRejected":true,"deletionDetected":true,"recursiveScan":true,"relativePath":"incoming/smoke-report.csv"}`

Therefore:

**Native smoke = PASS**

This proves on PC01 the selected-root persistence, filesystem event path, deduplication, changed-file detection, partial-write stabilization, rapid-file detection, traversal rejection, deletion detection, and recursive scanning behavior.

### Separate E2E worktree checks

The connected `report-advisor-e2e` worktree is locally modified and detached; it was not reset or rewritten.

Passed:

- execution-enforcement adversarial suite
- file-security regressions
- end-to-end document pipeline contract
- production scenario matrix
- production release decision
- final certification provenance
- report-execution checkpoint hardening

Failed / not closed:

- `check-execution-enforcement-protocol.test.mjs` failed because its fixture/index did not contain the expected current-head candidate. This is a governance/index alignment failure in the detached E2E worktree, not evidence of a product runtime failure.

## Working-tree safety

No local changes were reset or discarded.

The desktop source worktree retains:

- modified `package-lock.json`
- untracked `desktop/release/` artifacts

The separate E2E worktree also retains its pre-existing local modifications/artifacts.

## Next execution front

1. Reconcile the detached E2E worktree's current-head governance fixture without discarding its local changes.
2. Continue exact-HEAD release/PDF/persistence fronts from repository authority.
3. Use the proven PC01 native smoke as durable device evidence; do not rerun it unless the Electron/native-watch code or environment changes.
4. Do not convert any NOT PROVEN state into PASS without fresh evidence.
