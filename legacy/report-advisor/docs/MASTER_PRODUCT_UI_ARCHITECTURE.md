# MASTER PRODUCT UI ARCHITECTURE — AGHBARI
> **Authority:** canonical product/UI architecture for Report-Advisor / الأغبري.
> **Purpose:** the application is built and visually unified from this document. Legacy/Bolt/commerce CRUD navigation is not an alternate product direction.

## Product identity
**الأغبري — Business Decision Operating System**
Evidence-First BI + Document Intelligence + Decision Intelligence.

Core chain:
`Data → Truth → Evidence → Signal → Decision → Approval → Action → Outcome → Learning → Benchmark`

## Mandatory information architecture
1. **مركز القرار — Decision Center**
   - نبض الأعمال
   - مركز القرار
   - تجربة القرار
2. **البيانات والتشغيل — Data Operations**
   - مركز العمل
   - إدخال البيانات
   - تحليل المستندات
   - جودة البيانات
   - مصادر البيانات
3. **التحليل التجاري — Business Analytics**
   - مساحة التحليلات
   - المبيعات
   - المشتريات
   - التحصيل والذمم
   - الربحية والهامش
   - المخزون
   - ذكاء المخزون
   - حركة الطلب
   - RFM / ABC / Aging
4. **الذكاء والقرار — Intelligence & Decision**
   - مركز الذكاء
   - التوصيات
   - التنبؤات
   - السيناريوهات
5. **الثقة والأدلة — Trust & Evidence**
   - تفسير المؤشرات / Metric Inspector
   - evidence/provenance/truth context wherever the existing UI exposes it
   - no invented Evidence Center/Passport route until a real canonical route exists
6. **التقارير والمخرجات — Reports & Outputs**
   - مركز التقارير
   - التقرير التنفيذي
   - تقارير المبيعات والمشتريات والمخزون والتحصيل والربحية
7. **البيانات المرجعية — Master Data**
   - العملاء
   - المنتجات
   - المخزون
   - مجموعات البدائل
8. **الإعدادات — Settings**
   - تجهيز المنصة
   - إعدادات الشركة
   - الملف الشخصي

## Persistent Aghbari Advisor
The Advisor is a **global fixed intelligence layer**, not a Sidebar section and not a generic chatbot.
- Available from every major screen.
- Opens as a compact fixed drawer/chat surface.
- Uses the existing canonical/deterministic intelligence context.
- Must show source/as-of/truth state when answering.
- Never invents KPI values.
- Never bypasses approval, persistence, tenant isolation, or canonical RPC paths.
- AI remains assistive; authoritative financial calculations remain deterministic.

## Visual system
- Native Arabic RTL.
- Aghbari dark navigation; restrained teal/emerald, mint, warm gold, neutral surfaces.
- Shared shell, typography, spacing, cards, KPI, tables, charts, forms, states and dialogs.
- Enterprise BI density without clutter.
- Mobile/PWA/low-bandwidth first.
- Progressive disclosure; no legacy visual islands.
- Evidence/truth states are visible: VERIFIED / TRUSTED / PARTIAL / REVIEW / BLOCKED / INSUFFICIENT DATA.
- Real data only. Missing data is an explicit state.

## Product flow
`Source → Extraction → Normalization → Validation → Evidence → Confidence → Canonical Data → KPI → Analysis → Signal → Recommendation → Decision → Approval → Action → Outcome → Learning → Benchmark`

## Hard exclusions
Do not reintroduce:
- Bolt-style sectioning.
- Generic commerce/ERP CRUD as the product identity.
- Proposal/demo surfaces in primary navigation.
- Duplicate navigation registries.
- Fake KPI/data/evidence.
- New RPCs/runners merely to support UI.
- Parallel architecture that bypasses existing canonical paths.

## Existing canonical paths remain authoritative
`get_dashboard_snapshot`
`get_dashboard_intelligence`
`runDurableProductionLifecycle`
`production-coordinator-bridge.ts`
`import_commit_batch`
`import_finish_job`

## Change rule
A new route/section must prove it belongs to this architecture. Otherwise keep it internal, merge it into an existing surface, or remove it after dependency inspection.
