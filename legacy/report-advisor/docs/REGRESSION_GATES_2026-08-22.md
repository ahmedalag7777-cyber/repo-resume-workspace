# Regression gates — 2026-08-22

## Document intelligence
- Percentage tokens `%` and `٪` must be recognized.
- Arabic digits must normalize to Latin digits before numeric parsing.
- Negative percentages must preserve sign.
- Semantic CI must validate behavior, not a single implementation spelling.

## CI policy
- Do not declare success from an old workflow run.
- Every changed `main` commit must have a fresh authoritative quality run.
- Typecheck, lint, build, performance, architecture, intelligence and document-intelligence gates remain mandatory.
