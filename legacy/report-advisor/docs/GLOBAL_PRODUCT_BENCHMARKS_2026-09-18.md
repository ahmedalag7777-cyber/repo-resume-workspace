# الأغبري — Global Product Benchmark & Pattern Translation
## 2026-09-18

هذه الوثيقة لا تستنسخ أي منتج أو واجهة. هدفها استخراج الأنماط التي أثبتتها منتجات عالمية وتحويلها إلى مبادئ أصلية داخل الأغبري.

## 1. المبدأ التنفيذي

المعيار ليس "شكل أجمل" بل:
**Context → Evidence → Insight → Decision → Action → Outcome**

أي ميزة جديدة يجب أن تجيب:
- لماذا تهم المستخدم الآن؟
- ما الدليل الذي يثبتها؟
- ما الإجراء المتاح؟
- أين سيأخذ الإجراء؟
- كيف نعرف أن النتيجة حدثت؟

## 2. أنماط مرجعية معتمدة

### Linear — سرعة الوصول والعمل بالسياق
أنماط مفيدة:
- Command/Search يعمل كمدخل موحد للوصول.
- Recent/Favorites تختصر الوصول المتكرر.
- Custom views تحفظ حالة الفلاتر والترتيب.
- Display options تسمح بتخصيص العرض.
- السياق الحالي يرفع الأوامر الأكثر صلة.

الترجمة إلى الأغبري:
- لوحة أوامر واحدة للصفحات والإجراءات.
- مفضلات شخصية ومسارات حديثة.
- Views محفوظة للتقارير والعمل التشغيلي عندما يدعم المصدر ذلك.
- خيارات العرض لا تغيّر حقيقة البيانات، فقط طريقة رؤيتها.
- أوامر السياق تظهر بجوار المشكلة أو المؤشر بدل إجبار المستخدم على العودة إلى قوائم أخرى.

### Notion — مساحة عمل قابلة للتشكيل
أنماط مفيدة:
- الشريط الجانبي قابل للتخصيص وإخفاء الأقسام مع بقاء الوصول من Library.
- Favorites وRecents تجعل المسارات المتكررة أقصر.
- البيانات نفسها يمكن أن تظهر في عدة Views مع فلاتر وفرز وتجميع.
- فتح السجل Side Peek يحافظ على سياق الجدول.

الترجمة إلى الأغبري:
- Essential / Advanced / Expert ككثافة عرض.
- إخفاء بصري فقط؛ الصلاحيات تبقى خادمة وTenant-scoped.
- Views محفوظة للمبيعات والذمم والمخزون وجودة البيانات.
- Side Peek أو Context Drawer للعميل/المنتج/الفاتورة/الدليل عندما يكون المسار آمناً ومتاحاً.
- لا نحول كل تخصص إلى صفحة مستقلة إذا كان يمكن إبقاؤه داخل سياق العمل.

### Stripe — الشاشة الرئيسية للعمل والمال
أنماط مفيدة:
- Home يركز على أهم المعلومات المالية والمهام المتكررة.
- Widgets قابلة للإضافة/الحذف/الترتيب.
- Reports منفصلة عندما تحتاج قراءة محاسبية أدق.
- البحث يصل بسرعة إلى العملاء والمدفوعات والموارد.
- التصدير والتقارير القابلة للتصفية جزء من المنتج نفسه.

الترجمة إلى الأغبري:
- "اليوم" هو Command Center لا معرض KPIs.
- Widgets الأولية: المال، التحصيل، المخزون، جودة البيانات، القرارات.
- التقرير التنفيذي يختلف عن الشاشة التشغيلية.
- بحث يصل إلى العميل والمنتج والفاتورة والتقرير والقرار.
- التصدير لا يفصل عن سياق الفترة والعملاء/المنتجات.

### HubSpot — 360° حول الكيان
أنماط مفيدة:
- سجل الكيان يضم Overview + Associations + Activity timeline.
- حقول وبطاقات السجل قابلة للتخصيص.
- النشاط يظهر زمنياً داخل السجل بدلاً من إجبار المستخدم على لوحة منفصلة.

الترجمة إلى الأغبري:
- Customer 360 وProduct 360 يجب أن يكونا مركز قرار وليس مجرد جدول.
- أهم الخصائص والأدلة في أعلى السجل.
- التاريخ/الحركة/التوصيات في Timeline عندما يكون لها مصدر حقيقي.
- العلاقات بين العميل والفواتير والمنتجات والقرارات تظهر في السياق.

### Tableau Pulse / Power BI — BI مؤسس على Semantic/Metric Trust
أنماط مفيدة:
- طبقة مقاييس/معنى موحد تقلل اختلاف تعريف الرقم.
- تحليل "لماذا" مع تفسير بصري واستشهادات/مصادر.
- AI لا يصبح موثوقاً دون نموذج وبيانات موثوقة ومُهيأة.
- البحث الذكي يجب أن يحترم صلاحيات المستخدم.

الترجمة إلى الأغبري:
- Metric identity وdefinition وperiod وtenant وas-of وfreshness وevidence ثابتة.
- المساعد يقدم تفسيراً مبنياً على الدليل، وليس أرقاماً غير مثبتة.
- البحث لا يعرض إلا ما تسمح به صلاحيات الـtenant.
- Unknown/Insufficient data يبقى Unknown/Insufficient data.

### UiPath Document Understanding — Human-in-the-loop
أنماط مفيدة:
- انخفاض الثقة يرسل العنصر إلى مراجعة بشرية بدلاً من تمريره بصمت.
- شاشة المراجعة تعرض الحقل المستخرج وقيمة الثقة ومخالفة قواعد الأعمال.
- Validation خطوة مستقلة قبل الإيداع النهائي.

الترجمة إلى الأغبري:
- PDF/OCR ليس مجرد Upload→Done.
- واجهة المراجعة تعرض: extraction confidence + OCR confidence + validation result + reason.
- حالات أقل من سياسة الثقة تدخل Review/Reject؛ لا تُجمّل إلى Trusted من الواجهة.
- لا Commit قبل المرور بالمسار القانوني الموجود.

### ServiceNow — Approval / Audit as a first-class workflow
أنماط مفيدة:
- بطاقة الاعتماد تعرض القاعدة، المراجع، زمن الخطوة، والتعليق.
- سجل الاعتماد يبقى قابلاً للتتبع.
- Approve/Reject يحدث من نفس مساحة السياق.

الترجمة إلى الأغبري:
- Decision Experience يعرض Observation → Evidence → Recommendation → Decision → Action → Outcome.
- كل موافقة/رفض/تأجيل يحتاج حالة قابلة للإثبات.
- لا توجد "حالة قرار" مصممة في الواجهة فقط.

## 3. ما الذي سنبنيه فعلياً

### A. Today / Command Center
يجب أن يكون:
- ما يحدث
- ما يحتاج انتباهاً
- أين المال
- لماذا
- ما الإجراء التالي

وليس:
- ثمانية KPIs متجاورة فقط.

### B. Operational Workbench
Import / Data Quality / Connections:
- قائمة عمل
- حالة
- سبب
- أثر
- إجراء
- دليل
- عودة إلى المصدر

### C. Entity 360
Customers / Products:
- Overview
- money exposure
- operational status
- activity/history
- recommendations
- evidence
- related objects

### D. Reports
- Executive summary
- operational reports
- saved views
- filters
- compare
- export
- explicit context

### E. Intelligence
- Ask
- Explain
- Compare
- Trace to evidence
- Open related object/report
- never invent metrics or confidence

### F. Workspace personalization
- favorites
- recent
- Essential/Advanced/Expert
- saved views
- default landing
- dashboard widget visibility
- no security bypass

## 4. معايير القبول

لا نقبل ميزة جديدة ما لم:
1. يكون لها سياق عمل واضح.
2. تكون حالتها قابلة للفهم عندما تكون البيانات ناقصة.
3. يكون مصدرها/دليلها قابلاً للتتبع عندما تكون قابلة للإثبات.
4. يكون الإجراء التالي واضحاً.
5. تحافظ على صلاحيات Tenant/RLS.
6. لا تضيف Runner/RPC مكرراً إذا كان المسار الموجود قادراً.
7. لا تُنشئ PASS أو Evidence أو Confidence اصطناعية.
8. لا تجعل النسخة المحمولة مجرد تصغير للنسخة المكتبية.

## 5. قرارات تجارية ثابتة

- أهم ما يظهر دائماً: Today, Money, Receivables, Inventory, Customers, Products, Decisions, Reports.
- RFM / ABC / Metric Inspector / specialist analytics تظهر تدريجياً.
- Evidence وData Quality ليستا تفاصيل تقنية مخفية؛ تظهران عند الحاجة لاتخاذ القرار.
- كل Insight مهم يجب أن يحتوي مساراً إلى Action.
- كل Action مهم يجب أن يقود إلى Outcome قابل للقراءة لاحقاً.

## 6. المصدر المرجعي الخارجي

تمت مراجعة الأنماط من التوثيق الرسمي/المنتجات الرسمية:
- Linear Docs: Favorites, Custom Views, Display Options, Search.
- Notion Help: Sidebar, Library, Database Views, Layouts.
- Stripe Support/Docs: Dashboard widgets, Reports, Search.
- HubSpot Knowledge Base: CRM records, timelines, customizable record layouts.
- Tableau Pulse: metrics layer, explanations, citations, trusted AI.
- Microsoft Power BI: semantic models, Copilot grounding, verified answers.
- UiPath Document Understanding: extraction confidence, validation, human review.
- ServiceNow: approval workflow cards, audit trail, approve/reject context.

هذه المراجع مصدر للإلهام في الأنماط فقط؛ هوية الأغبري ومكونات تصميمه وقواعد البيانات والمسارات القانونية تبقى أصلية ومحددة في مستودع المشروع.
