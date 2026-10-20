# Exact Main Runtime Evidence — 2026-09-18

## Product code/test candidate

- Exact code/test candidate: `c466666cef65d082383aca4fd3384261e9f64690`
- Main merge: PR #550 structured PDF/file-engine repair
- Verification device: PC01
- Worktree: `C:\Users\Report-Advisor-main-current`
- Supabase target for PDF runtime: staging project `fnqbvfuwbdpwvhcgzksl`

## Exact-Main verification

- File-engine architecture contract: **PASS**
- Structured PDF/OCR behavioral regression: **PASS**
- Web production build: **PASS** — 2,800 modules transformed, build completed successfully
- Native Electron watched-folder smoke: **PASS**
  - root persistence
  - native filesystem watch events
  - duplicate suppression
  - changed-file detection
  - partial-write stabilization
  - rapid-file detection
  - traversal rejection
  - deletion detection
  - recursive scanning

## Packaging boundary

Windows x64 NSIS packaging was started against this exact Main candidate. Electron-builder remained active without emitting the completion result for an extended interval, so the process was terminated to avoid indefinite resource consumption.

**Packaging at exact Main candidate: NOT PROVEN.**

An earlier source-equivalent PDF branch produced a verified installer, but that artifact is not promoted as exact-Main packaging evidence.

## Release boundary

This document does not certify production. Authenticated business persistence, worker recovery/DLQ, Arabic golden-corpus end-to-end runtime, watched-folder business lifecycle, production separation, and final certification remain governed by the Master Index.
