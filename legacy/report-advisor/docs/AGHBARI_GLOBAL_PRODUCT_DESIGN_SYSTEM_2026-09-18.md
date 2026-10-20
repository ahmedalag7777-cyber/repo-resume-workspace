# الأغبري — Global Product Design System
## 2026-09-18

القاعدة: نأخذ المبدأ الوظيفي من المنتجات العالمية، لا الشكل الحرفي.

### الاتجاه
الأغبري Business Command System وليس Admin Template.
كل شاشة تجيب: ماذا يحدث؟ ما الذي يحتاج انتباهًا؟ لماذا؟ ماذا أفعل؟ ماذا حدث؟

### التراتبية
اليوم والمال والاستثناءات والقرار أولًا. الحقيقة والدليل ثانيًا. التحليل المتقدم ثالثًا. الإدارة رابعًا.

### الكثافة
canvas محايد، radius 8–14px، حدود 1px، الظل للطبقات العائمة فقط. body 12–14px في أسطح الأعمال، العناوين 22–34px، الجداول 11–13px، وmobile inputs ≥16px. hit targets ≥44px على الهاتف.

### اللون
accent واحد للتركيز. الأحمر للخطر، الأصفر للمراجعة، الأخضر للنجاح المثبت. لا يعتمد المعنى على اللون وحده. Power BI يوصي بتباين لا يقل عن 4.5:1 للنص واستخدام ألوان أقل عندما لا تضيف معنى. citeturn916695search3

### التنقل
Today → Command/Search → Contextual navigation → Favorites/Recents. Linear يثبت قيمة custom views والاختصارات، وNotion يركز على sidebar قابل للتخصيص وInbox/notifications داخل السياق. citeturn916695search0turn916695search2turn916695search10turn916695search5

### overlays والرسائل
Toast لنتيجة فعل سريع. Inline alert للمشكلة داخل المحتوى. Modal للتأكيدات والمهام الحرجة. Drawer/side peek للسياق دون مغادرة الصفحة. Shopify يميز بوضوح بين Modal وPopover وSheet وTooltip ويستخدم Toast للتغذية الراجعة. citeturn126188search1turn126188search8turn126188search16

### التقارير
كل تقرير يحمل الفترة والشركة والعملة وas-of وfreshness وحالة الدليل. يجب التفريق بين summary وitemized عندما تكون طبيعة التقرير مالية/تشغيلية. Stripe يفصل هذه الصيغ في تقارير PDF. citeturn126188search0

### PDF والطباعة
A4 افتراضي، إخفاء chrome، بدون ظلال، ومنع كسر البطاقات. Power BI يجعل صفحة التقرير صفحة PDF ويشير إلى PDF كمسار أكثر ثباتًا للطباعة؛ Tableau يعامل page setup/orientation كجزء من التصميم. citeturn126188search3turn126188search4turn126188search12

### الوصولية
keyboard everywhere، focus-visible، أسماء للأزرار الأيقونية، native semantics قبل ARIA، headings متسلسلة، وعدم حجب focus بالـsticky overlays. هذه مبادئ صريحة في Web Interface Guidelines من Vercel. citeturn916695search6

### بوابة الجودة
Hierarchy → Density → Evidence → Action → Accessibility → Mobile → Print → Empty/Loading/Error.
