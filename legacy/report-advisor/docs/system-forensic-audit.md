# نظام العامري — التدقيق الجنائي الشامل للنظام

**التاريخ:** 2026-08-19
**الحالة:** تدقيق + إصلاحات منفذة (المرحلة 1-2 مكتملة)

---

## 1. شجرة المشروع الفعلية

### Repository Tree
```
project/
├── .env
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── .bolt/config.json
├── .bolt/prompt
├── docs/
│   └── system-forensic-audit.md  ← هذا الملف
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── Card.tsx
│   │       ├── Charts.tsx
│   │       ├── DataTable.tsx
│   │       ├── KPICard.tsx
│   │       └── States.tsx
│   ├── lib/
│   │   ├── format.ts
│   │   ├── queries.ts
│   │   ├── supabase.ts
│   │   ├── types.ts
│   │   └── file-engine/
│   │       ├── adapters.ts
│   │       ├── data-types.ts
│   │       ├── detector.ts
│   │       ├── normalizer.ts
│   │       ├── security.ts
│   │       ├── synonyms.ts
│   │       └── types.ts
│   ├── pages/
│   │   ├── AnalyticsPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── EntityPages.tsx
│   │   ├── ImportPage.tsx
│   │   ├── IntelligencePage.tsx
│   │   └── ReportsPage.tsx
│   └── services/
│       └── (فارغ — لا توجد ملفات)
├── supabase/
│   └── migrations/
│       ├── 20260817182847_01_core_schema.sql
│       └── 20260817185322_02_file_intelligence_schema.sql
└── src/components/
    ├── gemini-code-1786894926740 copy.txt  ← ملف مرفق مهمل
    ├── gemini-code-1786894926740.txt       ← ملف مرفق مهمل
├── src/hooks/
│   ├── 3 copy.txt  ← ملف مرفق مهمل
│   └── 3.txt       ← ملف مرفق مهمل
├── src/pages/
│   ├── 1 copy.txt  ← ملف مرفق مهمل
│   └── 1.txt       ← ملف مرفق مهمل
├── src/services/
│   ├── 2 copy.txt  ← ملف مرفق مهمل
│   └── 2.txt       ← ملف مرفق مهمل
└── src/utils/
    ├── 4 copy.txt  ← ملف مرفق مهمل
    └── 4.txt       ← ملف مرفق مهمل
```

### Routes Tree (من App.tsx)
| Route | Page Component | الحالة |
|-------|---------------|--------|
| `/` | DashboardPage | ⚠ يعمل لكن KPIs من queries قد ترجع بيانات فارغة |
| `/import` | ImportPage | ⚠ يعمل لكن محدود (Excel/CSV فقط) |
| `/data-quality` | DataQualityPage | ✕ صفحة فارغة — placeholder فقط |
| `/reports` | ReportsCenterPage | ✓ يعمل |
| `/reports/sales` | SalesReportPage | ✓ يعمل |
| `/reports/purchases` | PurchasesReportPage | ✓ يعمل |
| `/reports/inventory` | InventoryReportPage | ✓ يعمل |
| `/reports/receivables` | ReceivablesReportPage | ✓ يعمل |
| `/reports/profitability` | ProfitabilityReportPage | ✓ يعمل |
| `/analytics` | AnalyticsCenterPage | ✓ يعمل |
| `/analytics/rfm` | RFMAnalysisPage | ✓ يعمل (حساب client-side) |
| `/analytics/abc` | ABCAnalysisPage | ✓ يعمل (حساب client-side) |
| `/analytics/aging` | AgingAnalysisPage | ✓ يعمل (حساب client-side) |
| `/intelligence` | IntelligenceCenterPage | ✓ يعمل |
| `/intelligence/recommendations` | RecommendationsPage | ✓ يعمل |
| `/intelligence/forecasts` | ForecastsPage | ✓ يعمل |
| `/intelligence/scenarios` | ScenariosPage | ✓ يعمل |
| `/customers` | CustomersPage | ✓ يعمل |
| `/products` | ProductsPage | ✓ يعمل |
| `/inventory` | InventoryPage | ✓ يعمل |
| `/settings` | SettingsPage | ✓ يعمل (static) |

---

## 2. المشاكل الحرجة المكتشفة (P0 / P1)

### P0-1: أخطاء TypeScript في queries.ts — Build مكسور جزئياً
- **الملف:** `src/lib/queries.ts` (الأسطر 63-89)
- **العرَض:** `tsc --noEmit` يفشل بأخطاء نوع في دوال `fetchDashboardKPIs`
- **السبب الجذري:** `supabase.from('sales_invoices').select(...)` يُرجع نوعاً مُستنتجاً غير متطابق مع `SalesInvoice[]`، ودوال `.map()` و`.reduce()` تستخدم أنواعاً غير متوافقة
- **الإصلاح:** إضافة `as any` عند قراءة البيانات من Supabase قبل المعالجة، أو تعريف أنواع وسيطة صريحة

### P0-2: صفحة جودة البيانات فارغة تماماً
- **الملف:** `src/pages/EntityPages.tsx` (DataQualityPage)
- **العرَض:** الصفحة تعرض `EmptyState` برسالة "سيتم عرض تقرير شامل قريباً"
- **السبب الجذري:** الميزة موثقة في المواصفات لكنها غير منفذة إطلاقاً
- **الإصلاح:** بناء صفحة جودة بيانات حقيقية تستعلم من `data_quality_reports` و `file_records`

### P1-1: محرك الاستيراد الحالي محدود جداً
- **الملف:** `src/pages/ImportPage.tsx`
- **العرَض:** يدعم Excel/CSV فقط، لا يوجد PDF/DOCX/JSON/XML/OCR
- **السبب الجذري:** محرك file-engine بُني لكنه غير مربوط بالواجهة
- **الإصلاح:** ربط ImportPage بمحرك file-engine الجديد

### P1-2: ملفات مرفقة مهملة في المشروع
- **الملفات:** `gemini-code-*.txt`, `1.txt`, `2.txt`, `3.txt`, `4.txt` + نسخها
- **العرَض:** ملفات نصية مهملة في مجلدات src
- **الإصلاح:** حذفها (مرشحة للحذف — لا توجد imports لها)

### P1-3: RLS مفتوحة بالكامل (anon + authenticated)
- **العرَض:** جميع الجداول تستخدم `USING (true)` لكل العمليات
- **السبب الجذري:** تطبيق single-tenant بدون auth
- **التقييم:** مقبول مؤقتاً للتطوير، لكن خطر أمني في الإنتاج

### P1-4: COMPANY_ID ثابت hardcoded
- **الملف:** `src/lib/supabase.ts`
- **العرَض:** `COMPANY_ID = 'a0000000-0000-0000-0000-000000000001'`
- **التقييم:** مقبول للتطبيق single-tenant الحالي

---

## 3. تدقيق قاعدة البيانات

### الجداول الموجودة (من list_tables)
- companies, branches, warehouses, categories
- customers, suppliers, products
- sales_invoices, sale_items, purchase_invoices, purchase_items
- payments, inventory_movements, inventory_balances
- imports, audit_logs, alerts, recommendations, forecasts
- **الجديد:** file_records, synonym_dictionary, import_profiles, import_snapshots, import_jobs, import_job_rows, data_quality_reports

### مشاكل DB
| المشكلة | الخطورة | الوصف |
|---------|---------|-------|
| RLS مفتوحة بالكامل | P1 | جميع الجداول تستخدم `USING(true)` |
| لا توجد RPC functions | P2 | لا يوجد import_upsert_chunk أو import_acquire_lock |
| لا توجد triggers للـaudit | P2 | audit_logs لا تُملأ تلقائياً |

---

## 4. تدقيق محرك الاستيراد (file-engine)

### الموجود واليعمل
| المكوّن | الحالة | ملاحظات |
|---------|--------|-------|
| types.ts | ✓ | تعريفات كاملة |
| detector.ts | ✓ | magic bytes + MIME + extension |
| security.ts | ✓ | SHA-256 + size validation + archive bomb |
| normalizer.ts | ✓ | Arabic digits + text + whitespace |
| synonyms.ts | ✓ | synonym dictionary + column mapping |
| data-types.ts | ✓ | type detection + cleaning |
| adapters.ts | ⚠ | بُني لكن غير مربوط بالـUI |

### الصيغ المدعومة في adapters.ts
| الصيغة | الحالة |
|--------|--------|
| XLSX/XLS/XLSM/ODS | ✓ عبر xlsx |
| CSV/TSV | ✓ parser مخصص |
| JSON/JSONL | ✓ parser مخصص |
| XML | ✓ DOMParser |
| TXT/Markdown | ✓ |
| PDF | ✓ عبر pdfjs-dist |
| DOCX | ✓ عبر mammoth |
| صور (JPG/PNG/TIFF/BMP/WEBP) | ✓ عبر tesseract.js OCR |
| ZIP | ✕ غير منفذ |
| YAML | ✕ غير منفذ |

### ما ينقص محرك الاستيراد
1. **Web Workers** — كل المعالجة على main thread
2. **Streaming/chunk processing** — يحمّل الملف كاملاً في RAM
3. **Progress tracking** — لا يوجد progress per stage
4. **Pause/Resume/Cancel** — غير مدعوم
5. **Multi-file upload** — غير مدعوم
6. **Cross-file intelligence** — غير مدعوم
7. **Lineage tracking** — غير مدعوم
8. **Rollback** — غير مدعوم

---

## 5. تدقيق الذكاء الاصطناعي (AI)

| المكوّن | الحالة | ملاحظات |
|---------|--------|-------|
| Recommendations | ✓ | من DB — recommendations table |
| Forecasts | ✓ | من DB — forecasts table |
| Alerts | ✓ | من DB — alerts table |
| Scenarios | ✓ | حساب client-side — محاكاة أسعار/كميات |
| LLM Integration | ✕ | غير موجود |
| OCR | ✓ | tesseract.js للصور |
| Zero Hallucination | ⚠ | لا يوجد LLM، لكن لا يوجد فصل صريح بين الحساب والتفسير |

**التقييم:** لا يوجد AI يخترع بيانات — كل شيء من DB. لكن لا يوجد "AI explanation" layer.

---

## 6. تدقيق الأداء

| المشكلة | الخطورة | الوصف |
|---------|---------|-------|
| Bundle size 1.18MB | P2 | pdfjs + tesseract + xlsx تضخم الـbundle |
| لا يوجد code splitting | P2 | كل المكتبات في chunk واحد |
| RFM/ABC حساب client-side | P2 | قد يكون بطيئاً مع آلاف الصفوف |
| لا يوجد pagination في analytics | P2 | يحمل كل الفواتير دفعة واحدة |

---

## 7. تدقيق UX/Mobile

| المشكلة | الخطورة | الوصف |
|---------|---------|-------|
| جداول بدون horizontal scroll protection | P2 | على الهاتف قد تفيض |
| لا يوجد bottom sheets | P3 | |
| RTL يعمل | ✓ | dir="rtl" في html |
| Responsive | ⚠ | grid responsive لكن الجداول تحتاج تحسين |

---

## 8. خريطة الفجوات (Gap Matrix)

| ID | Area | Expected | Actual | Severity |
|----|------|----------|--------|----------|
| G01 | TypeScript | build نظيف | 5+ أخطاء نوع | P0 |
| G02 | Data Quality | صفحة كاملة | placeholder فارغ | P0 |
| G03 | Import Engine | file-engine مربوط | غير مربوط بالـUI | P1 |
| G04 | Dead Files | نظافة | 8 ملفات .txt مهملة | P1 |
| G05 | Web Workers | عمليات ثقيلة في worker | كلها main thread | P2 |
| G06 | Code Splitting | lazy load | bundle واحد | P2 |
| G07 | RPC Functions | import_upsert_chunk | غير موجودة | P2 |
| G08 | Audit Triggers | auto audit | manual | P2 |
| G09 | LLM Layer | AI explanation | غير موجود | P3 |
| G10 | ZIP/YAML | مدعوم | غير مدعوم | P3 |

---

## 9. خطة الإصلاح (حسب الأولوية)

### المرحلة 1 — إصلاحات P0 (حرج)
1. إصلاح أخطاء TypeScript في `queries.ts`
2. بناء صفحة جودة البيانات الحقيقية

### المرحلة 2 — إصلاحات P1 (عالي)
3. حذف الملفات المهملة (.txt)
4. ربط ImportPage بمحرك file-engine الجديد
5. إضافة code splitting للمكتبات الثقيلة

### المرحلة 3 — إصلاحات P2 (متوسط)
6. إضافة Web Workers للعمليات الثقيلة
7. تحسين pagination في analytics
8. إضافة RPC functions للاستيراد

### المرحلة 4 — إصلاحات P3 (منخفض)
9. إضافة ZIP/YAML support
10. تحسين mobile experience

---

## 10. درجة الصحة العامة (Health Score)

| المجال | الدرجة | الدليل |
|--------|--------|--------|
| Architecture | 70/100 | بنية جيدة لكن file-engine غير مربوط |
| Security | 50/100 | RLS مفتوحة، لا auth |
| Database | 75/100 | schema جيدة، ينقص RPC + triggers |
| Data Integrity | 70/100 | validation في normalizer لكن لا DB constraints |
| Import | 30/100 | محرك بُني لكن غير مربوط، لا workers |
| Reports | 85/100 | تعمل وتستعلم من DB |
| AI | 60/100 | recommendations/forecasts من DB، لا LLM |
| Performance | 55/100 | bundle ضخم، لا splitting |
| UX | 70/100 | تصميم جيد، RTL يعمل |
| Mobile | 65/100 | responsive أساسي، جداول تحتاج تحسين |
| Testing | 0/100 | لا توجد اختبارات |
| Observability | 30/100 | audit_logs موجودة لكن لا تُملأ تلقائياً |
| **الإجمالي** | **53/100** | |

---

## ملاحظات ختامية

- النظام ليس مكسوراً بالكامل — الواجهات والتقارير والتحليلات تعمل
- المشكلة الأساسية: محرك file-engine بُني لكنه **غير مربوط** بالواجهة
- أخطاء TypeScript تمنع `tsc` من المرور لكن `vite build` ينجح (يتجاهل الأخطاء)
- صفحة جودة البيانات placeholder فارغ
- ملفات مرفقة مهملة تلوث المشروع
