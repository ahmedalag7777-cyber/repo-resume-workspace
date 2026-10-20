# Environment & CI Diagnostic Report — 2026-09-09

## Purpose

This document is the authoritative recorded checkpoint for the environment and CI diagnostic results supplied by the project owner. Future execution must reuse these results and must not ask the owner to repeat these checks unless fresh evidence is required because the environment changed.

## Stage A — Vercel ↔ GitHub Integration

**Status: CONNECTED / HEALTHY**

- Vercel is connected to `Report-Engainall/Report-Advisor`.
- Repository integration and permissions were verified successfully.

## Stage B — GitHub Actions Quality Workflows

**Status: BLOCKED / FAILED — ACCOUNT BILLING, NOT SOURCE-CODE FAILURE**

Observed workflow run:

- Quality run: `#4431`
- Commit: `b9b7c3b` (full current main SHA at the checkpoint: `b9b7c3bd48662bf0d4c7d21f34049cca27836bab`)
- Job: `verify`

Observed GitHub failure message:

> The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings.

Interpretation:

- The job was blocked before normal workflow execution.
- This is an account/billing constraint, not evidence of a failing TypeScript/build/test implementation.
- Do not weaken quality gates to bypass this condition.

## Stage C — Vercel Environment Variables

**Status: CONFIGURED / PRESENT**

The required variables were verified for both Production and Preview environments:

- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No values are recorded in this document; only presence/configuration status is recorded.

## Stage D — Supabase Staging Database & Auth

**Status: HEALTHY / MATCHED**

Confirmed active/confirmed users:

1. `adnanabderab2016@gmail.com`
2. `osamaadnan2020@gmail.com`

Auth settings verified:

- Email Provider: Enabled
- Allow new users to sign up: Enabled
- Confirm email: Enabled

Required database functions/RPCs were verified as present, including:

- `advance_report_execution_checkpoint`
- `claim_report_execution_job`
- `get_dashboard_snapshot`
- and the other required system RPCs checked during the diagnostic.

## Stage E — Vercel Deployments

**Status: BLOCKED**

- Recent Production and Preview deployments were observed as `Blocked`.
- The diagnosed cause is the GitHub Actions check blockage caused by the account billing/spending-limit condition in Stage B.

## Operational rule for future execution

These five stages are already diagnosed and recorded. Do not ask the project owner to repeat them as a prerequisite for continued engineering. Continue work on independent code/evidence fronts while the external billing/CI condition remains unresolved.

When the billing condition is corrected, rerun the relevant CI gates and record the exact run ID, SHA, job result, and logs as fresh evidence. Do not convert this diagnostic into a PASS for product certification; it is an environment diagnosis.

## Relationship to release certification

This report does **not** certify Production Runtime, Authenticated E2E, Live Tenant Isolation, Backup/Restore, Rollback, or final sellable release status. Those remain evidence-driven gates requiring their own exact runtime/operational proof.
