# بوابة قبول تأسيس الأدوات

## النتيجة المحددة

**مسارات الاستخراج الأربعة مثبتة تشغيلياً؛ لا إعلان PASS شامل للتطبيق أو ملحق V6.** القدرة المؤجلة لها سبب وبديل في `TOOLING_REGISTRY.md`؛ لا يستكمل أي جزء يعتمد عليها بادعاء أنها موجودة.

## إثبات قابل لإعادة التشغيل

1. اختبارات الحسابات والبيانات:

```sh
bunx vitest run src/test/document-tooling.test.ts src/test/universal-pipeline.test.ts src/test/monthly-matrix.test.ts src/test/app-routing.test.tsx
```

النتيجة 2026-10-26: **22 اختباراً ناجحاً في 4 ملفات**. تشمل: جمع `0.1 + 0.2 = 0.3`، المتوسط والانحراف لعينة معلومة، أرقام عربية، رفض تاريخ مستحيل، إجماليات عربية، مواضع OCR وترويسة متفاوتة الارتفاع، خلايا Word المدمجة، مصدر الصف، حجب الدفع والعودة للحساب المحلي، ومصفوفات العملاء.

2. اختبار تشغيل داخل حساب الطالب نفسه؛ لا يكتفي بحالة تسجيل الخروج:

```sh
lovable auth-session --json --self
mkdir -p /tmp/browser/tooling
cp tests/tooling_check.py /tmp/browser/tooling/check_documents.py
python3 /tmp/browser/tooling/check_documents.py
```

ينشئ مستندات اختبار اصطناعية **وليست تقريراً تجارياً قدمه المستخدم**: Word وPDF نصي وصورة وPDF ممسوح. كل ملف له ثلاثة عملاء ومبالغ 125.50، 200.25، 74.25، مجموع مرجعي 400.00. هذه عينات تحقق من نوع تقرير أعمال واقعي، ولا تكفي لاعتماد كل تنسيقات تقارير المستخدم.

النتيجة التشغيلية المسجلة 2026-10-26:

```text
VERIFIED: tooling-verification.docx: 3 rows, 3 columns, all amounts preserved, saved and read back
VERIFIED: tooling-verification.pdf: 3 rows, 3 columns, all amounts preserved, saved and read back
VERIFIED: tooling-verification.png: 3 rows, 3 columns, all amounts preserved, saved and read back
VERIFIED: tooling-scanned.pdf: 3 rows, 3 columns, all amounts preserved, saved and read back
VERIFIED: mobile preview has no page overflow
VERIFIED: no browser page errors
Test-only analysis cleanup: True
```

المسار الذي اختُبر: اختيار ملف → استخراج → مراجعة الترويسة والصفوف والقيم → تأكيد المستخدم → التحقق/التحليل → حفظ عبر حسابه → فتح النتائج → عرض البيانات المقروءة من النتيجة المحفوظة. حذف الاختبار اقتصر على المعرّفات التي أنشأها تشغيل الاختبار.

صور الاختبار في `/tmp/browser/tooling` دليل مؤقت قابل للتوليد مجدداً بالسكربت؛ لا تعتمد البوابة على بقاء الملفات المؤقتة. تمت مراجعة صورة PDF الممسوح ومعاينة الهاتف 390×844 بصرياً: الترويسة والصفوف الثلاثة صحيحة والأزرار غير متداخلة.

3. توافق التطبيق: آخر سجل بناء بعد إصلاح قارئ PDF في 2026-10-26: **build OK**. لا يُستخدم نجاح البناء بديلاً عن الاختبارات التشغيلية أعلاه.

## ما لم تثبته البوابة

- ملف المستخدم التجاري الأصلي، OCR عربي معقد أو متداخل، ملفات ضخمة، PDF متعدد الصفحات مدمج.
- إعادة حساب صيغ أو تحويل مستند محافظ على التنسيق أو تشغيل نموذج محلي فعلي.
- تصدير GitHub: مؤجل بطلب المستخدم؛ لم يُدفع العمل إلى GitHub من الوكيل.
- اكتمال جميع شاشات Report-Advisor أو الوثيقة الأساسية؛ `الرسالة.txt` صفر بايت.

متطلبات V6 المتقدمة (رسم الاعتماد/سجل التحويلات الكامل، استنتاج المعادلات، التعافي، تعلم النتائج، المطابقة متعددة المصادر) تبقى في خارطة العمل ولا تُعد مكتملة بمجرد توفر الأدوات الأساسية.