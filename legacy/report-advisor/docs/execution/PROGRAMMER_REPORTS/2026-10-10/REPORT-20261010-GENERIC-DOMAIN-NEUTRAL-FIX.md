# Execution checkpoint — 2026-10-10 — generic table domain-neutrality fix

## CURRENT EXECUTION REPORT — 2026-10-10 — KEEP GENERAL TABLE ANALYSIS DOMAIN-NEUTRAL

APPLICATION_HEAD = pending-this-commit
PARENT_HEAD = 789700d2f77dbab841ca5e68bc82aced63cf7717
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = #912 OPEN / NOT MERGED
MAIN_HEAD = fa1ab4cbade9b01685507aa966c10f700a03f576
DATE = 2026-10-10

WHAT CHANGED IN THIS TRANSACTION =
- Tightened `profileStructuredTable` in `src/lib/file-engine/generic-intelligence.ts`: a table is customer-portfolio-shaped only when there is a real customer identity column (for example customer_name / اسم العميل / اسم الزبون) plus status and totals/month structure. An item/supplier label plus status and total no longer gets a customer-churn interpretation.
- Expanded format assertions to require CSV, JSON, JSONL, XML, YAML examples with generic item/status/total fields remain domain-neutral.
- Corrected a false-positive in the merge regression: the simulated specialist layer now contains only one overlapping signal and its own specialist records, not every generic signal/recommendation from the base. Assertions require the generic-only status signal and reconciliation recommendation to arrive from the general layer, and require both evidence sources on overlapping IDs.
- This preserves the existing core and all source-bound/decision gates.

CURRENT PROOF =
- Parent HEAD read back as `789700d2f77dbab841ca5e68bc82aced63cf7717`, PR #912 open, not merged.
- The code/test changes in this transaction are new; build and runtime tests are not yet proven.
- The prior application SHA `a077dfebea99f8848b086f0b04dbedf83a2d6b17` was Vercel READY; its Vercel/Netlify preview/CodeRabbit statuses were successful. Those results do not transfer to the new fix SHA.
- No current-head authenticated browser or persisted report readback proof. PRODUCT_COMPLETE = NO.

NEXT EXACT ACTION =
Inspect the first terminal new-head build/quality result, repair the first actual failure, then use Full Product Browser E2E to verify the same source hash through upload, saved Smart Report, navigation and reload.

