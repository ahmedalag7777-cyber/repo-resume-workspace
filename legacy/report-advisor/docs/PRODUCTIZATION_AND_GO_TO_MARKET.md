# Report-Advisor — Productization, Licensing & Go-To-Market

## 1. Product principle
Report-Advisor is a commercial multi-tenant analytics product. Open-source components are implementation details, not the customer-facing product identity.

The product must never falsely claim that proprietary components are original if they are derived from third-party open-source software. Preserve required copyright/license notices in the distribution and comply with each dependency's license.

## 2. Hidden implementation architecture
Use a capability/adapter architecture:

- `document-ingestion`: PDF/Office/CSV/XLSX parsing and OCR adapters.
- `analytics-engine`: DuckDB/Arrow/Polars/Pandas adapters where appropriate.
- `semantic-layer`: canonical business metrics and lineage.
- `forecast-engine`: deterministic demand/stock calculations plus validated ML models.
- `bi-renderer`: charts, pivots, dashboards and report layouts.
- `ai-orchestrator`: local/open models and optional external providers behind a provider interface.
- `decision-engine`: alerts, recommendations and explainable actions.
- `billing-entitlements`: plan/trial/license enforcement.

The UI should expose product capabilities, not vendor/library names. Do not expose internal stack names through navigation, default error messages, telemetry labels, or AI responses.

## 3. Trial strategy
Recommended default: 14-day full-feature trial. Configurable to 7 or 14 days by tenant/offer.

During trial, the customer receives the same core product experience as paid users, including advanced reports and AI features subject to fair-use/resource limits. Avoid artificial low-quality trial output: the goal is to demonstrate product value.

At trial end, use a graceful entitlement downgrade rather than deleting data:

### Free / expired state
- Preserve imported data and existing reports.
- Allow login and data inspection.
- Allow limited dashboard access and a small number of refreshed reports.
- Disable premium exports, advanced forecasting, scheduled reports, automation, AI analysis quotas, multi-user administration and premium integrations according to plan.
- Show clear upgrade prompts with the reason a capability is locked.
- Never falsify, corrupt, or intentionally degrade historical report data.

### Paid state
Entitlements are server-authoritative and tenant-scoped. Never rely only on a browser boolean to unlock paid functionality.

## 4. Entitlement model
Use a capability matrix rather than hard-coded plan checks scattered through the UI.

Suggested capabilities:
- `basic_dashboards`
- `advanced_dashboards`
- `report_studio`
- `scheduled_reports`
- `pdf_export`
- `excel_export`
- `advanced_forecasting`
- `inventory_reorder_engine`
- `cashflow_crisis_engine`
- `chat2bi`
- `ai_research`
- `ocr_processing`
- `large_file_processing`
- `automation_workflows`
- `api_access`
- `webhooks`
- `multi_user_rbac`
- `audit_log`
- `data_lineage`
- `priority_support`

Plans should contain limits as well as boolean capabilities:
- users
- data sources
- monthly processed rows
- document pages
- OCR pages
- AI requests
- scheduled jobs
- storage
- API requests

## 5. Licensing security
The browser is not a trusted licensing authority.

Required architecture:
1. tenant identity
2. signed/server-validated entitlement
3. expiry timestamp
4. plan and capability claims
5. grace period for temporary connectivity loss
6. server-side enforcement for premium APIs/jobs/exports
7. audit trail for entitlement changes

Offline/local installations should use signed licenses with expiration and a bounded offline grace period.

## 6. Commercial packages
Do not permanently fix pricing in application code. Store plan configuration server-side so pricing and packaging can change without redeployment.

Suggested positioning:
- Trial: full experience for 14 days.
- Starter: core BI/reporting for small businesses.
- Professional: advanced analytics, forecasting and automation.
- Business: multi-user, advanced finance/inventory intelligence and scheduled reporting.
- Enterprise: private deployment, SSO, advanced governance, custom integrations and support.

Use feature-based upgrade messaging, not fear-based messaging.

## 7. Customer lifecycle
Lead → trial started → data imported → first useful report → first insight → first recommendation → recurring use → trial ending → conversion → expansion → renewal.

Instrument product events around value milestones, not surveillance. Examples:
- `trial_started`
- `first_dataset_imported`
- `first_report_created`
- `first_forecast_viewed`
- `first_decision_recommendation_opened`
- `first_scheduled_report`
- `trial_day_3_value_check`
- `trial_day_7_value_check`
- `trial_day_12_upgrade_prompt`
- `trial_expired`
- `subscription_activated`

## 8. In-product messaging schedule
Messages must be configurable and localized.

### Trial day 0
Welcome + explain the fastest path to first useful result.

### Day 1–2
Show data quality and first insights.

### Day 3–5
Highlight inventory, sales and finance intelligence relevant to the tenant's actual data.

### Day 6–9
Show recommendations and automation opportunities.

### Day 10–12
Explain what premium capabilities will remain available after trial and what will require activation.

### Day 13
Clear reminder: trial ends soon, with exact date/time and plan options.

### Day 14
Trial-expiry screen with preserved data, clear upgrade CTA, and no destructive behavior.

### Post-expiry
Use restrained reminders. Do not spam. Offer a short reactivation path and export/data-retention information.

## 9. Annual marketing roadmap
### Year 1 — Product-market fit
- Focus on one strong promise: turn business data into decisions.
- Case studies around inventory, liquidity and sales.
- Free trial funnel.
- Guided onboarding.
- Referral program.
- Educational content in Arabic and English.

### Year 2 — Expansion
- Vertical templates: grocery/wholesale, retail, distribution, finance.
- Partner/reseller channel.
- API/integration marketplace.
- Team plans.
- Benchmarking with privacy-safe aggregated metrics where legally permitted.

### Year 3 — Platform
- Agent/workflow marketplace.
- Private deployments.
- Enterprise governance.
- Industry-specific intelligence packs.
- White-label/reseller capabilities where licensing permits.

### Year 4+ — Intelligence network
- Predictive planning.
- Scenario simulation.
- Cross-system decision automation.
- Global/local benchmark intelligence with explicit consent and strong privacy controls.

## 10. Ethical conversion rules
- No fake countdowns.
- No fake accuracy claims.
- No fabricated AI confidence.
- No deliberate corruption of trial data.
- No hidden charges.
- Clearly state trial length and renewal terms.
- Give customers access to their data and an export path subject to plan policy.
- Preserve open-source license notices and attribution where required.

## 11. UX requirements
Premium locks should appear as product education:

"هذه الميزة متاحة في Professional — فعّل الخطة لمتابعة التنبؤ اليومي وإعادة الطلب تلقائيًا."

not:

"ERROR: LICENSE REQUIRED"

The application should feel complete during trial and paid usage; entitlement boundaries should be understandable, predictable and reversible.

## 12. Implementation priority
P0: entitlement model + tenant-aware trial state + server-side checks + upgrade UI + retention-safe expiry.
P1: billing provider adapter + invoices + coupons + plan management + transactional email hooks.
P2: reseller/affiliate + white-label + enterprise licensing + private deployment activation.

Never couple the product to a single payment provider. Use a billing adapter so providers can be changed later.
