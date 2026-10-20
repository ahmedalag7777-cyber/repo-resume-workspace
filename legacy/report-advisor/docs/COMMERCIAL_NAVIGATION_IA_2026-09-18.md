# Aghbari Navigation IA — Permanent UX Direction
## 2026-09-18

The current navigation taxonomy is rejected as the final commercial information architecture.

### Core rule
Navigation labels must describe the user's business goal, not the application's implementation taxonomy.

Avoid:
- البيانات المرجعية
- التحليل التجاري
- الإعداد والتجهيز
- الذكاء والاستشراف

Prefer:
- اليوم
- التشغيل
- المال
- العملاء والمنتجات
- القرار والذكاء
- التقارير
- الإدارة

### Permanent primary navigation

#### 1. اليوم
Landing: `/`
- لوحة القيادة
- مركز القيادة
- إجراءات اليوم
- تنبيهات مهمة

The user should know what needs attention without opening specialist pages.

#### 2. التشغيل
Hub: `/work-center`
- مركز العمل
- إدخال البيانات
- تحليل المستندات
- جودة البيانات
- المصادر والموصلات

The concept is “run the business/data operation”, not “manage technical data”.

#### 3. المال
Hub: `/reports`
- المبيعات
- المشتريات
- الذمم والتحصيل
- الربحية
- التقرير المالي/executive where applicable

This section must be visually prominent because it maps directly to customer value and money.

#### 4. العملاء والمنتجات
Hub: `/customers`
- العملاء
- المنتجات
- المخزون
- البدائل

The user thinks in customers, products, stock and opportunities; “reference data” is an implementation term and must not be the visible group title.

#### 5. القرار والذكاء
Hub: `/intelligence`
- التوصيات
- التنبؤات
- السيناريوهات
- RFM
- ABC
- الأعمار
- مراقب المقاييس

Advanced items must be progressively disclosed. The primary label is the business outcome “قرار وذكاء”, not a technical AI taxonomy.

#### 6. التقارير
Hub: `/reports/executive`
- التقرير التنفيذي
- مركز التقارير
- تقارير المبيعات
- تقارير المشتريات
- تقارير المخزون
- التقارير المتخصصة

Reports are deliverables/work products, not the main operating navigation.

#### 7. الإدارة
Hub: `/settings`
- تجهيز الشركة
- الإعدادات
- الملف الشخصي
- العرض التقديمي / Proposal Demo
- Billing/Usage when available
- Security/Operations when available

### Visual behavior

Do not render all child routes as a long permanent list.

Primary sidebar should expose only the 7 commercial hubs plus:
- a compact primary action
- global search/command
- current company/workspace context
- user/account controls

Children should appear using contextual navigation:
- hover/click flyout or compact contextual panel on desktop
- bottom sheet/context drawer on mobile
- breadcrumb/context tabs inside pages
- Command Palette for every route

### Home/Today shortcut strip

A high-value strip should always be available:
- استيراد
- تقرير تنفيذي
- الذمم
- المخزون
- قرار اليوم

This is a shortcut layer, not a duplicate navigation tree.

### Terminology rules

Use the language of a business owner:
- “المال” over “التحليل التجاري”
- “العملاء والمنتجات” over “البيانات المرجعية”
- “القرار والذكاء” over “الذكاء والاستشراف”
- “التشغيل” over “العمل والبيانات”
- “اليوم” over a generic “لوحة التحكم” as the top-level destination

### Commercial UX objective

Within five seconds the user should understand:
What is happening → what needs action → where the money is → what decision is next.

The sidebar is a command rail, not a sitemap.

### Anti-patterns

Permanently avoid:
- long 20–35 item sidebar lists
- implementation-oriented section names
- identical visual weight for daily actions and specialist analytics
- forcing users to learn the application's internal taxonomy
- making RFM/ABC/Metric Inspector equal in navigation weight to Sales/Receivables/Inventory
