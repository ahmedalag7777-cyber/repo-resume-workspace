# Report Advisor — Cross-Platform Delivery & Watched-Folder Execution

Date: 2026-08-25
Status: ACTIVE EXECUTION
Source of truth: `main`

## Objective

Make the same product available as:

- responsive web application in supported browsers;
- installable PWA where supported;
- desktop application for Windows-class environments;
- installable mobile application for Android and iOS;
- one canonical file-ingestion pipeline shared by all surfaces.

The product must not require OneDrive, Google Drive, Dropbox, or another third-party application merely to watch a local folder.

## Watched-folder contract

The user selects a folder through the platform's native directory picker. The application stores a durable folder identity/permission where the platform allows it. New or modified supported files enter the existing governed ingestion queue and are fingerprinted so unchanged files are skipped.

Deletion is reconciliation-driven and must never silently erase canonical business data merely because a source file disappeared.

## Capability matrix

| Surface | Folder selection | Automatic while active | Background after app closes | Delivery status |
|---|---|---|---|---|
| Web | Progressive browser API | Yes where supported | No | FOUNDATION / capability-aware |
| PWA | Progressive browser API | Yes where supported | No assumption | FOUNDATION / capability-aware |
| Windows desktop | Native folder picker | Yes | Yes | REQUIRED NATIVE ADAPTER |
| Android app | Native storage permission | Yes | Yes subject to OS permission/background policy | REQUIRED NATIVE ADAPTER |
| iOS app | Native document/folder access | Yes | Must not promise arbitrary local-folder background watch | REQUIRED CAPABILITY-AWARE ADAPTER |

## Implementation rule

Never expose a fake universal promise such as "paste any local path and the browser will monitor it forever". Browser/PWA surfaces use progressive enhancement and active-session polling where the File System Access capability exists. Native desktop/mobile surfaces own persistent filesystem monitoring through a local adapter.

All adapters emit the same canonical events:

`folder-selected → scan-started → file-discovered → file-changed → file-unchanged → file-removed → queued → processed → checkpointed → reconciled`

## Current execution additions

1. Added `platform-folder-capability.ts` to make platform limitations explicit and fail-closed.
2. Added `check-cross-platform-folder-capability.mjs` as a regression contract.
3. Registered the contract in `package.json`.
4. Existing browser watched-folder implementation remains the canonical web/PWA foundation.
5. Next implementation target is the native adapter boundary for Windows, Android and iOS, without duplicating the ingestion engine.

## Next execution sequence

1. Define the native adapter interface against the existing folder-watch contract.
2. Implement Windows persistent watcher first.
3. Implement Android native directory watcher/permission bridge.
4. Implement iOS foreground/session-safe adapter and explicit background capability reporting.
5. Bind all adapters to the existing queue, incremental fingerprint ledger, checkpoints and reconciliation.
6. Add platform matrix CI contracts and runtime acceptance evidence.
7. Verify low-bandwidth/mobile behavior and offline recovery.
8. Run Quality after each meaningful batch and fix the first real failure before advancing.
