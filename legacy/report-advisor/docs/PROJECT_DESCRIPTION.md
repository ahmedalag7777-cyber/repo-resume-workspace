# Report-Advisor — الوصف الرسمي للمشروع

> هذا الملف هو الوصف المرجعي الرسمي للمشروع بالعربية والإنجليزية. يصف طبيعة المنتج كما هي في المستودع الحالي دون ادعاء أن كل قدرات الإنتاج قد حصلت على دليل تشغيل حي.

## العربية

### الوصف المختصر
**Report-Advisor هو منصة ذكية وآمنة لتحليل البيانات والوثائق وذكاء الأعمال واتخاذ القرار، مصممة لتستقبل ملفات وبيانات أعمال متعددة المصادر، تفهم بنيتها وتتحقق من جودتها وتطابق كياناتها وتنفذ التحليلات والتقارير والاستخبارات التشغيلية بصورة قابلة للتتبع، مع عزل صارم للمؤسسات والمستخدمين واعتماد الأدلة قبل القرارات والإجراءات المؤثرة.**

### الوصف الكامل
Report-Advisor ليس مجرد عارض تقارير أو مولّد رسوم بيانية؛ بل هو **طبقة ذكاء أعمال وبيانات ووثائق موجهة للأدلة** تربط دورة حياة البيانات من المصدر الخام حتى التقرير والقرار والنتيجة.

يبدأ النظام من استقبال البيانات والوثائق، ثم اكتشاف المخطط والعناوين والحقول، والتطبيع والتحويل الدقيق، والربط الدلالي، وحل الكيانات ومطابقة مفاتيح الأعمال، والتحقق الرياضي والمصالحة، وتسجيل المصدر والأصل (provenance)، ثم يوجه البيانات إلى المراجعة والحجر (quarantine) عند عدم كفاية الثقة قبل السماح بالترويج إلى البيانات القانونية.

وعلى طبقة الأعمال يوفر النظام التقارير والتحليلات ومؤشرات الأداء وذكاء المخزون والطلب والربحية والتحصيل، إضافة إلى التنبؤات والسيناريوهات والتوصيات وذكاء القرار. كما يتضمن بنية للوظائف المستديمة، ونقاط التحقق والاستئناف، والأدلة، والمراقبة، والحوكمة، والتعافي، وشهادة الإصدارات.

الأمان ليس طبقة إضافية؛ فهو جزء من نموذج النظام. يعتمد المشروع على **عزل المؤسسات (multi-tenant isolation)** وRLS وحل مركزي للمؤسسة الحالية وفشل مغلق عند غموض العضوية، مع منع تسرب البيانات بين المؤسسات. كما يلتزم النظام بمبدأ أن الذكاء الاصطناعي استشاري ومقيد بالأدلة، وليس مصدرًا للحقيقة الرقمية أو المالية.

### أهم المبادئ
- لا فقد صامت لحقول المصدر.
- لا وصول بين المؤسسات.
- لا قرار عالي التأثير بلا أدلة وسياسات واضحة.
- لا ترقية من المراجعة/الحجر إلى البيانات القانونية بلا تحقق.
- لا توصية إعادة تزويد تتجاهل قيود السيولة المحمية.
- لا أفق طلب مخفي؛ الأفق مدخل صريح في التشغيل والتقارير.
- البيانات والأرقام المالية هي مصدر الحقيقة؛ الذكاء الاصطناعي لا يخترعها.
- كل ادعاء إنتاجي يجب أن يملك أثرًا تنفيذيًا ودليلًا حديثًا.

### الوصف التسويقي المختصر
**منصة ذكاء أعمال وبيانات ووثائق تحول الملفات والبيانات الخام إلى معلومات موثوقة، تقارير قابلة للتتبع، تحليلات متقدمة، توصيات وقرارات مدعومة بالأدلة — مع أمان متعدد المؤسسات وحوكمة صارمة من المصدر حتى القرار.**

---

## English

### Short Description
**Report-Advisor is a secure, evidence-first platform for data and document intelligence, business intelligence, analytics, and decision support. It ingests heterogeneous business data and documents, discovers and validates their structure, reconciles entities and business keys, produces traceable reports and operational intelligence, and governs high-impact decisions with explicit evidence and strict multi-tenant isolation.**

### Full Description
Report-Advisor is more than a report viewer or dashboard generator. It is an **evidence-first data, document, and business-intelligence layer** that connects the lifecycle from raw source material to trusted data, reporting, decisions, outcomes, and certification.

The platform starts with heterogeneous business files and documents, then performs schema and header discovery, deterministic normalization, semantic mapping, business-key/entity resolution, mathematical validation, reconciliation, provenance tracking, and confidence-aware review/quarantine before data can be promoted into governed canonical records.

On top of that foundation, Report-Advisor provides business reporting, analytics, KPI intelligence, inventory and demand intelligence, profitability and receivables analysis, forecasting, scenarios, recommendations, and decision intelligence. The repository also contains foundations for durable jobs, checkpoints and resumability, evidence graphs, operational health, governance, resilience, rollback, and production certification.

Security is a first-class architectural property. The platform uses **multi-tenant isolation**, row-level security, canonical tenant resolution, fail-closed behavior for missing or ambiguous membership, and controlled access paths designed to prevent cross-tenant data exposure. AI is advisory and evidence-bound; it is not treated as the source of financial or numerical truth.

### Core Principles
- No silent source-field loss.
- No cross-tenant data access.
- No high-impact automation without explicit evidence and policy gates.
- No promotion from review/quarantine to governed data without validation.
- No replenishment recommendation that ignores protected liquidity constraints.
- No hidden demand horizon; horizons are explicit runtime/report inputs.
- Financial and numerical truth comes from governed data, not AI-generated claims.
- Production claims require current executable evidence.

### Product Positioning
**An evidence-first business intelligence and document/data intelligence platform that turns raw business files and operational data into trusted information, traceable reports, advanced analytics, recommendations, and governed decisions — with strong multi-tenant security and end-to-end evidence from source to decision.**

## Current implementation truth

The repository contains substantial implemented and gated foundations across document/data intelligence, ingestion, reconciliation, tenant/RLS, analytics, operational intelligence, resumable execution, resilience, and production-certification frameworks. However, implementation status is intentionally distinguished from runtime evidence and production certification. Current project truth is maintained by the Master System Inventory, Master Execution Index, Current Delta, and execution ledgers.
