# Scenario financial truth guard — 2026-09-08

## Finding

Authenticated Tenant B runtime exposed a scenario simulator showing a current revenue baseline of 450,000 and current cost of 315,000 while the canonical profitability screen reported `INSUFFICIENT_DATA` with `CURRENCY_MISMATCH`.

The underlying source code contained hardcoded scenario baselines (`450000` revenue and `315000` cost). This violated the system rule that unknown/missing financial truth must not become a fabricated number.

## Root cause

The scenario UI was presentation-local and did not require the canonical profitability snapshot before calculating the scenario.

## Repair

`ScenarioTruthGuardPage` now requires:

- canonical profitability status = `CALCULATED`
- canonical revenue != null
- canonical cost != null

Only then is the existing simulator rendered. Otherwise the UI fails closed with an explicit explanation and the canonical reason codes.

## Regression

A repository-native guard verifies that the scenario route cannot bypass the truth guard.

## Integrity

- Base SHA: `d0ddda19a21a341bc77931d14c2358545c6fd328`
- No database mutation.
- No data deletion or rewriting.
- No Production alias mutation.
- No historical migration rewrite.
