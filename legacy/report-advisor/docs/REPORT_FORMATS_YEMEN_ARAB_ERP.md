# Arabic / Yemen ERP Report Format Dictionary

## Purpose
This is a capability dictionary for automatic report recognition. It is intentionally **synonym- and schema-based**, not a claim that one vendor has one universal export format. ERP installations can rename columns, add custom fields, change Arabic wording, or export different report layouts.

## Auto-ingestion contract
1. A watched/local folder is scanned continuously or on schedule by the Local Sync Agent.
2. New/changed files are fingerprinted with SHA-256 and matched against an idempotency ledger.
3. File type, workbook sheets, headers, merged cells, report title, metadata and sample rows are detected.
4. Header aliases are normalized across Arabic/English, whitespace, punctuation, Arabic/Latin digits and common accounting abbreviations.
5. A report classifier scores candidate schemas; it must retain evidence for every mapped field.
6. Ambiguous mappings are quarantined for review; the system must never silently invent a mapping.
7. Parsed rows enter the canonical import engine and the existing validation/security/deduplication/commit path.
8. Per-file results are retained: detected system, report type, confidence, mapped/ignored columns, rows accepted/rejected, hash, timestamps and errors.

## Universal canonical fields

### Document identity
- document_number: رقم المستند, رقم الفاتورة, رقم الفاتورة, رقم الحركة, رقم القيد, رقم السند, No, Number, Invoice No, Doc No, Voucher No
- document_type: نوع المستند, نوع الفاتورة, نوع الحركة, نوع السند, Document Type
- document_date: التاريخ, تاريخ المستند, تاريخ الفاتورة, تاريخ الحركة, Date, Invoice Date, Transaction Date
- reference_number: رقم المرجع, المرجع, Reference, Ref No
- branch: الفرع, اسم الفرع, Branch
- warehouse: المخزن, المستودع, المستودع/المخزن, Warehouse, Store
- currency: العملة, Currency
- exchange_rate: سعر الصرف, معامل التحويل, Exchange Rate

### Party
- customer_code: كود العميل, رقم العميل, Customer Code, Customer No, Account Code
- customer_name: اسم العميل, العميل, Customer Name, Customer
- supplier_code: كود المورد, رقم المورد, Supplier Code, Supplier No
- supplier_name: اسم المورد, المورد, Supplier Name, Supplier
- salesperson: المندوب, اسم المندوب, Sales Rep, Salesperson
- account_code: رقم الحساب, كود الحساب, Account Code, Ledger Account
- account_name: اسم الحساب, الحساب, Account Name, Account

### Product / item
- sku: رقم الصنف, كود الصنف, رمز الصنف, رقم المادة, Item Code, Item No, Product Code, SKU, Barcode
- item_name: اسم الصنف, الصنف, اسم المادة, Item Name, Product Name, Description
- barcode: الباركود, باركود, Barcode, EAN
- unit: الوحدة, وحدة القياس, Unit, UOM
- quantity: الكمية, Qty, Quantity
- free_quantity: الكمية المجانية, مجاني, Free Qty, Bonus Qty
- unit_price: سعر الوحدة, سعر البيع, السعر, Unit Price, Price, Sale Price
- cost_price: سعر التكلفة, التكلفة, Cost, Cost Price
- discount: الخصم, Discount
- discount_percent: نسبة الخصم, Discount %, Discount Percent
- tax: الضريبة, ضريبة, Tax, VAT
- tax_percent: نسبة الضريبة, Tax %, VAT %
- net_amount: الصافي, صافي القيمة, Net, Net Amount
- gross_amount: الإجمالي, إجمالي, Gross, Gross Amount
- total_amount: المبلغ, القيمة, إجمالي الفاتورة, Total, Amount

### Inventory
- opening_quantity: الرصيد الافتتاحي, الكمية الافتتاحية, Opening Qty
- incoming_quantity: الوارد, كمية الوارد, Receipts, Purchases Qty, In Qty
- outgoing_quantity: المنصرف, كمية المنصرف, Issues, Sales Qty, Out Qty
- transfer_in: تحويل وارد, Transfer In
- transfer_out: تحويل صادر, Transfer Out
- adjustment_quantity: تسوية كمية, Adjustment Qty
- closing_quantity: الرصيد, الرصيد الحالي, الرصيد الختامي, Closing Qty, Balance, On Hand
- reserved_quantity: المحجوز, Reserved Qty
- available_quantity: المتاح, Available Qty
- reorder_level: حد الطلب, الحد الأدنى, Reorder Level, Min Stock

### Financial / ledger
- debit: مدين, Debit
- credit: دائن, Credit
- balance: الرصيد, Balance
- journal_number: رقم القيد, Journal No
- payment_method: طريقة الدفع, طريقة السداد, Payment Method
- paid_amount: المدفوع, المبلغ المدفوع, Paid Amount
- due_amount: المتبقي, المستحق, Due, Remaining
- due_date: تاريخ الاستحقاق, Due Date
- cost_center: مركز التكلفة, Cost Center
- project: المشروع, Project

### Dates / periods
- fiscal_year: السنة المالية, السنة, Fiscal Year
- period: الفترة, الشهر, Period
- month: الشهر, Month
- from_date: من تاريخ, From Date
- to_date: إلى تاريخ, To Date

## Report-type signatures

### Sales invoice / sales report
Strong signals: document_number + document_date + customer + item + quantity + unit_price/total.
Common aliases: فاتورة مبيعات, مبيعات, تقرير المبيعات, Sales Invoice, Sales Report.

### Purchase invoice / purchases report
Strong signals: document_number + supplier + item + quantity + cost_price/total.
Common aliases: فاتورة مشتريات, مشتريات, تقرير المشتريات, Purchase Invoice, Purchases Report.

### Inventory / stock report
Strong signals: sku + item_name + warehouse + opening/closing/on-hand quantity.
Common aliases: تقرير المخزون, كشف المخزون, أرصدة الأصناف, Inventory, Stock Balance, Stock Report.

### Customer statement / receivables
Strong signals: customer/account + document_date + debit/credit/balance.
Common aliases: كشف حساب عميل, العملاء, الذمم المدينة, Customer Statement, Receivables.

### Supplier statement / payables
Strong signals: supplier/account + document_date + debit/credit/balance.
Common aliases: كشف حساب مورد, الموردين, الذمم الدائنة, Supplier Statement, Payables.

### General ledger / journal
Strong signals: account_code + account_name + journal/document number + debit/credit/balance.
Common aliases: الأستاذ العام, دفتر الأستاذ, القيود اليومية, General Ledger, Journal.

### Cash / bank
Signals: date + reference + description + debit/credit/balance + account/bank.
Common aliases: حركة الصندوق, كشف البنك, Cash Book, Bank Statement.

### Item movement / stock card
Signals: date + document/reference + item + warehouse + in/out + balance.
Common aliases: حركة صنف, بطاقة صنف, كرت الصنف, Item Card, Stock Card, Item Movement.

## ERP/vendor profiles

### Onyx Pro (أونكس برو)
The recognizer must support Onyx Pro exports through **profile signatures**, not a hard-coded assumption that all Onyx installations use identical headers. Profile aliases should include the universal Arabic/English aliases above plus user-learned aliases from approved mappings.

Expected families to recognize: sales, purchases, inventory, item movement, customers, suppliers, customer/supplier statements, general ledger, cash/bank, journal, profit/loss and balance-sheet style exports where their exported headers are present.

### Al-Mutakamil / المتكامل
Use the same canonical field vocabulary and add vendor-specific aliases only after observing an actual export. Never claim a header exists without a source export or approved mapping.

### Raqish / روقش and other Arabic accounting systems
Use adaptive schema detection: report title + header aliases + column order + data-type patterns + sample values. Vendor-specific profiles are learned from real exports and stored as versioned profiles.

## Profile structure
Each profile should contain:
- vendor/system name
- report family
- supported file formats
- title aliases
- header aliases per canonical field
- required fields
- optional fields
- forbidden/conflicting fields
- data type expectations
- unit/currency/date normalization rules
- confidence threshold
- sample evidence requirements
- profile version and source/evidence

## Critical governance
- Do not fabricate vendor headers.
- Do not map a column solely because its name is vaguely similar when the data type contradicts it.
- Preserve original headers and values alongside canonical mappings.
- Show mapping evidence and confidence before first approval of a new profile.
- A tenant-approved mapping can be reused automatically for later files with the same profile fingerprint.
- Profile changes are versioned and auditable.
- Unrecognized reports remain importable through manual mapping; they are not silently rejected.
