# تقرير الاستئناف التنفيذي — 11 أكتوبر 2026 — إصلاح إثبات الدليل في التقرير الذكي

## المرجع
- المستودع `Report-Engainall/Report-Advisor`؛ الفرع `fix/source-bound-generic-intelligence-20261009`
- PR [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912): مفتوح وغير مدمج.
- التزام الكود/الاختبار: [`08a46dd52decb9b60c3fe6e488c4f56d6ea75d00`](https://github.com/Report-Engainall/Report-Advisor/commit/08a46dd52decb9b60c3fe6e488c4f56d6ea75d00)
- `PRODUCT_COMPLETE = NO`

## الخطأ المثبت
في تشغيل [Full Product Browser E2E 38162258379](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38162258379)، نجح اختبار `source-bound-surface:inventory` مع تطابق معرف التقرير وبصمته وعدد 254 صفًا. فشلت الخطوة اللاحقة بعد تحديث التقرير الذكي عند انتظار النص الدقيق `EVIDENCE INSPECTOR` مدة 30 ثانية. هذا النص غير موجود في الواجهة الفعلية. تعرض الصفحة قسم Passport قابلًا للفتح تحت عنوان `التفاصيل الكاملة للتقرير`، ويظهر داخله العنوان `سلسلة الثقة لهذا التقرير`. ملف الدليل `result.json` سجّل `failures: []` ورسالة timeout لهذا المحدد تحديدًا. رُفع artifact ID `11711565090`.

## الإصلاح
غيّر الالتزام `08a46dd52decb9b60c3fe6e488c4f56d6ea75d00` ملف `scripts/real-business-e2e.mjs` ليستخدم إثبات واجهة التقرير الذكي الموجود، ويفتح قسم Passport الفعلي، وينتظر عنوان سلسلة الثقة الحقيقي، ثم يحافظ على فحوص `reportJobId` و`sourceHash` و`sourcePath`. لم يتغير مكوّن الإنتاج ولم تُحذف أي بوابة.

## ما لم يثبت
نجاح رحلة التقرير الذكي بعد هذا الإصلاح على الرأس `08a46dd52decb9b60c3fe6e488c4f56d6ea75d00`، واجتياز جميع بوابات الإنتاج والمرونة بعد تغيير SHA. لذلك لا اعتماد نهائي ولا دمج.

## الخطوة التالية
قراءة تشغيل Full Product Browser E2E والبوابات على الرأس الحالي، والتحقق من artifact الجديد بعد رفعه. إصلاح أول فشل وظيفي جديد مثبت فقط.
