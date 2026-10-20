import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, BarChart3, CheckCircle2, Download, FileImage, FileSpreadsheet, FileText, Loader2, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/States';
import { detectFormat } from '@/lib/file-engine/detector';
import { securityScan, computeSHA256 } from '@/lib/file-engine/security';
import { parseFile } from '@/lib/file-engine/adapters';
import { FORMAT_LABELS, MAX_FILE_SIZE, type FileFormat, type Dataset } from '@/lib/file-engine/types';
import { inferReportSpecialty, normalizeReportHeader } from '@/lib/file-engine/specialty-inference';
import { deriveReportIntelligence, type BusinessFinding, type ReportIntelligence, type ReportRecommendation, type ReportSignal } from '@/lib/report-intelligence/report-smart-insights';
import { buildUniversalReportIntelligence } from '@/lib/universal-report-intelligence';
import { buildGenericFileIntelligence } from '@/lib/file-engine/generic-intelligence';
import { UniversalIntelligenceChain } from '@/components/UniversalIntelligenceChain';
import { GenericFileIntelligenceCard } from '@/components/GenericFileIntelligenceCard';

function fileIcon(format: FileFormat) {
  if (['xlsx','xls','xlsm','csv','tsv','ods'].includes(format)) return <FileSpreadsheet size={18}/>;
  if (['pdf','docx','doc','rtf','txt','markdown'].includes(format)) return <FileText size={18}/>;
  if (['jpg','jpeg','png','webp','tiff','bmp'].includes(format)) return <FileImage size={18}/>;
  return <FileText size={18}/>;
}

function buildPreviewIntelligence(dataset: Dataset): ReportIntelligence {
  const specialty = inferReportSpecialty(dataset);
  const base = deriveReportIntelligence({
    specialty,
    rowCount: dataset.rowCount,
    sourceAnalysis: { datasets: [dataset] },
    canonicalRows: dataset.rows.map((data, index) => ({ row_number: index + 1, data })),
  });

  const normalize = normalizeReportHeader;
  const normalizedHeaders = new Set(dataset.columns.map((column) => normalize(column.name)));
  const inventoryShape = normalizedHeaders.has('currentstock') && normalizedHeaders.has('salesqty');
  const findColumn = (...aliases: string[]) => dataset.columns.find((column) => {
    const keys = [column.mappedField ?? '', column.name].map(normalize);
    return aliases.some((alias) => keys.some((key) => key.includes(normalize(alias))));
  });
  const valueOf = (row: Record<string, unknown>, column: typeof dataset.columns[number] | undefined): unknown => {
    if (!column) return undefined;
    return row[column.name] ?? row[column.mappedField ?? ''];
  };

  // Detect a customer portfolio table by its observed columns, not its filename.
  const customerNameColumn = findColumn('customer_name', 'customername', 'اسم العميل', 'العميل', 'customer', 'client');
  const totalColumn = findColumn('total', 'الإجمالي الكلي', 'grand total', 'total amount');
  const customerStatusColumn = findColumn('customer_status', 'حالة الزبون', 'حالة العميل', 'customer status');
  const abcColumn = findColumn('abc_classification', 'تصنيف الأهمية', 'تصنيف الاهمية', 'abc class');
  const riskIndicatorColumn = findColumn('risk_indicator', 'مؤشر المخاطر والفرص', 'مؤشر المخاطر', 'risk indicator');
  const monthDefinitions = [
    { label: 'يناير', keys: ['monthly_sales_jan', 'يناير', 'january', 'jan'] },
    { label: 'فبراير', keys: ['monthly_sales_feb', 'فبراير', 'february', 'feb'] },
    { label: 'مارس', keys: ['monthly_sales_mar', 'مارس', 'march', 'mar'] },
    { label: 'أبريل', keys: ['monthly_sales_apr', 'أبريل', 'ابريل', 'april', 'apr'] },
    { label: 'مايو', keys: ['monthly_sales_may', 'مايو', 'may'] },
    { label: 'يونيو', keys: ['monthly_sales_jun', 'يونيو', 'june', 'jun'] },
    { label: 'يوليو', keys: ['monthly_sales_jul', 'يوليو', 'july', 'jul'] },
    { label: 'أغسطس', keys: ['monthly_sales_aug', 'أغسطس', 'اغسطس', 'august', 'aug'] },
    { label: 'سبتمبر', keys: ['monthly_sales_sep', 'سبتمبر', 'september', 'sep'] },
    { label: 'أكتوبر', keys: ['monthly_sales_oct', 'أكتوبر', 'اكتوبر', 'october', 'oct'] },
    { label: 'نوفمبر', keys: ['monthly_sales_nov', 'نوفمبر', 'november', 'nov'] },
    { label: 'ديسمبر', keys: ['monthly_sales_dec', 'ديسمبر', 'december', 'dec'] },
  ];
  const monthColumns = monthDefinitions
    .map((month) => ({ ...month, column: findColumn(...month.keys) }))
    .filter((month) => Boolean(month.column)) as Array<{ label: string; keys: string[]; column: typeof dataset.columns[number] }>;
  const portfolioShape = Boolean(customerNameColumn && customerStatusColumn && (totalColumn || monthColumns.length >= 3));

  if (portfolioShape && customerNameColumn && customerStatusColumn) {
    const numericValue = (row: Record<string, unknown>, column: typeof dataset.columns[number] | undefined): number | null => {
      const raw = valueOf(row, column);
      if (raw === null || raw === undefined || String(raw).trim() === '') return null;
      const parsed = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '').trim());
      return Number.isFinite(parsed) ? parsed : null;
    };
    const numberLabel = (value: number) => value.toLocaleString('ar-YE', { maximumFractionDigits: 2 });
    const textValue = (row: Record<string, unknown>, column: typeof dataset.columns[number] | undefined) => String(valueOf(row, column) ?? '').trim();
    const normalizedValue = (value: string) => normalize(value).replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي');
    const customers = dataset.rows.map((row, index) => {
      const monthValues = monthColumns.map((month) => numericValue(row, month.column));
      const monthlyTotal = monthValues.some((value) => value !== null)
        ? monthValues.reduce<number>((sum, value) => sum + (value ?? 0), 0)
        : null;
      const statedTotal = numericValue(row, totalColumn);
      return {
        index,
        name: textValue(row, customerNameColumn) || 'عميل بلا اسم',
        status: textValue(row, customerStatusColumn),
        tier: textValue(row, abcColumn),
        risk: textValue(row, riskIndicatorColumn),
        total: statedTotal ?? monthlyTotal ?? 0,
        statedTotal,
        monthlyTotal,
        monthValues,
      };
    }).filter((customer) => customer.name !== 'عميل بلا اسم');
    type CustomerRecord = (typeof customers)[number];
    const isStopped = (customer: CustomerRecord) => normalizedValue(customer.status).includes(normalizedValue('منقطع'));
    const isVip = (customer: CustomerRecord) =>
      normalizedValue(customer.tier).includes(normalizedValue('الفئة أ'))
      || normalizedValue(customer.tier).includes('vip')
      || normalizedValue(customer.risk).includes('vip')
      || normalizedValue(customer.risk).includes(normalizedValue('خطر انقطاع'));
    const stopped = customers.filter(isStopped);
    const stoppedVip = stopped.filter(isVip);
    const monthStats = monthColumns.map((month, index) => {
      const observed = customers.map((customer) => customer.monthValues[index]);
      return {
        label: month.label,
        total: observed.reduce<number>((sum, value) => sum + (value ?? 0), 0),
        activeCustomers: observed.filter((value) => value !== null && value > 0).length,
      };
    });
    const totalPortfolioValue = customers.reduce((sum, customer) => sum + customer.total, 0);
    const rowsWithMonthlyAndStatedTotal = customers.filter((customer) => customer.statedTotal !== null && customer.monthlyTotal !== null);
    const inconsistentTotals = rowsWithMonthlyAndStatedTotal.filter((customer) =>
      Math.abs((customer.statedTotal ?? 0) - (customer.monthlyTotal ?? 0)) > Math.max(1, Math.abs(customer.statedTotal ?? 0) * 0.01),
    );
    const topCustomers = [...customers].sort((a, b) => b.total - a.total).slice(0, 5);
    const latestMonth = monthStats[monthStats.length - 1];
    const previousMonth = monthStats.length > 1 ? monthStats[monthStats.length - 2] : undefined;
    const latestChange = previousMonth && latestMonth && previousMonth.total !== 0
      ? ((latestMonth.total - previousMonth.total) / Math.abs(previousMonth.total)) * 100
      : null;
    const stoppedValue = (stoppedVip.length ? stoppedVip : stopped).reduce((sum, customer) => sum + customer.total, 0);
    const targetGroup = stoppedVip.length ? stoppedVip : stopped;
    const portfolioFinding: BusinessFinding = {
      id: 'preview:customer-portfolio:interruption',
      kind: stopped.length ? 'RISK' : 'FINDING',
      priority: stoppedVip.length ? 'high' : stopped.length ? 'medium' : 'low',
      title: stoppedVip.length ? 'عملاء مهمون مصنّفون في المصدر كمنقطعين' : 'نشاط العملاء حسب حالة المصدر',
      statement: stoppedVip.length
        ? 'يسجل المصدر ' + stoppedVip.length.toLocaleString('ar-YE') + ' عميلًا من الفئة المهمة/الموسومة VIP بحالة انقطاع، بإجمالي مصدرّي ' + numberLabel(stoppedValue) + ' دون افتراض عملة.'
        : 'يحتوي المصدر ' + customers.length.toLocaleString('ar-YE') + ' سجل عميل، منها ' + stopped.length.toLocaleString('ar-YE') + ' سجلًا تحمل حالة «منقطع» كما وردت في الملف.',
      value: targetGroup.length,
      unit: 'customers',
      dimensionLabel: 'حالة العميل',
      dimensionValue: 'منقطع',
      evidence: targetGroup.slice(0, 5).map((customer) =>
        customer.name + ' · الحالة: ' + customer.status + ' · الإجمالي: ' + numberLabel(customer.total) + ' · التصنيف: ' + (customer.tier || 'غير متاح'),
      ),
      limitation: 'الحالة ومؤشر المخاطر منقولان من الملف؛ يجب التحقق من آخر فاتورة/تاريخ شراء قبل اعتبار العميل متسربًا فعليًا أو اعتماد إجراء مالي.',
      action: 'راجع آخر تعامل للعملاء الأعلى قيمة والموسومين بالانقطاع، وثبّت سبب الحالة قبل تكليف المبيعات بإجراء استعادة.',
    };
    const monthEvidence = monthStats.map((month) =>
      month.label + ': إجمالي ' + numberLabel(month.total) + ' · عملاء لديهم شراء ' + month.activeCustomers.toLocaleString('ar-YE'),
    );
    const portfolioInspect = [
      'سجلات العملاء: ' + customers.length.toLocaleString('ar-YE'),
      'حالة منقطع في المصدر: ' + stopped.length.toLocaleString('ar-YE') + ' (' + (customers.length ? numberLabel(stopped.length / customers.length * 100) : '0') + '%)',
      'عملاء منقطعون وموسومون VIP/فئة أ: ' + stoppedVip.length.toLocaleString('ar-YE'),
      'قيمة الإجمالي المصدرية: ' + numberLabel(totalPortfolioValue) + ' (العملة غير مفترضة)',
      ...monthEvidence,
      'فحص الاتساق: قورن الإجمالي مع مجموع الأشهر في ' + rowsWithMonthlyAndStatedTotal.length.toLocaleString('ar-YE') + ' سجلًا؛ ' + inconsistentTotals.length.toLocaleString('ar-YE') + ' فرق يتجاوز 1%',
      'أعلى العملاء قيمة: ' + topCustomers.map((customer) => customer.name + ' (' + numberLabel(customer.total) + ')').join(' · '),
      ...(latestChange !== null && previousMonth && latestMonth ? ['التغير بين ' + previousMonth.label + ' و' + latestMonth.label + ': ' + (latestChange >= 0 ? '+' : '') + numberLabel(latestChange) + '% من إجمالي قيم الشهرين'] : []),
    ];
    const recommendedAction = stoppedVip.length
      ? 'ابدأ بالعملاء الأعلى قيمة ضمن مجموعة «منقطع»/VIP: تحقق من آخر تاريخ شراء وسبب التوقف، ثم سجّل نتيجة التواصل والشراء الجديد لكل عميل. لا تعتمد استرداد الإيراد قبل قياسه.'
      : stopped.length
        ? 'راجع سجلات العملاء المصنفة «منقطع» وتحقق من آخر تعامل وتاريخ الانقطاع قبل اعتماد أي إجراء.'
        : 'راجع اتجاه الشراء الشهري وقائمة أعلى العملاء قيمة، وثبّت خط أساس قبل اعتماد إجراء.';
    const proofRequirement = 'كل الأعداد والقيم مشتقة من ' + dataset.name + ' (' + dataset.rowCount.toLocaleString('ar-YE') + ' صفًا). الحالة والفئة تؤخذان من المصدر؛ لا تُفترض العملة أو أسباب الانقطاع أو نتيجة الاستعادة.';
    const portfolioEvidence = [
      'customerRows=' + customers.length,
      'stoppedCustomers=' + stopped.length,
      'stoppedVip=' + stoppedVip.length,
      'sourceFlaggedTotal=' + numberLabel(stoppedValue) + ' (currency unspecified)',
      ...monthEvidence.slice(-2),
      ...portfolioFinding.evidence.slice(0, 3),
    ];
    const portfolioSignal: ReportSignal = {
      id: 'preview:customer-portfolio:interruption',
      severity: stoppedVip.length ? 'high' : stopped.length ? 'medium' : latestChange !== null && latestChange < -20 ? 'medium' : 'info',
      title: stoppedVip.length ? 'عملاء مهمون مصنّفون في المصدر كمنقطعين' : stopped.length ? 'عملاء بحالة انقطاع واردة في المصدر' : latestChange !== null ? 'تغير مشتريات العملاء عبر الأشهر' : 'ملخص محفظة العملاء من المصدر',
      message: stopped.length ? portfolioFinding.statement : latestChange !== null && previousMonth && latestMonth
        ? 'تغير إجمالي الشراء من ' + previousMonth.label + ' إلى ' + latestMonth.label + ' بنسبة ' + (latestChange >= 0 ? '+' : '') + numberLabel(latestChange) + '% وفق أعمدة المصدر.'
        : portfolioFinding.statement,
      evidence: portfolioEvidence,
      affectedRows: stoppedVip.length || stopped.length || customers.length,
      soWhat: recommendedAction,
      impact: 'القيم وصف للمصدر وليست إثباتًا لخسارة مالية أو قيمة قابلة للاستعادة؛ الأثر الفعلي يتطلب قياسًا بعد الإجراء.',
      ownerHint: 'مدير المبيعات / مسؤول حسابات العملاء',
      priority: stoppedVip.length ? 'P1' : stopped.length ? 'P2' : latestChange !== null && latestChange < -20 ? 'P2' : 'P3',
      priorityReason: stoppedVip.length
        ? ['المصدر يصنف عملاء مهمين بحالة منقطع', 'يلزم التحقق من آخر شراء وسبب الحالة قبل الاعتماد']
        : stopped.length
          ? ['المصدر يتضمن حالات منقطع', 'يلزم مراجعة الحالة مع دليل التعامل الأخير']
          : ['الإشارة مشتقة من قيم الأشهر كما وردت في المصدر'],
    };
    const portfolioRecommendation: ReportRecommendation = {
      id: 'rec:' + portfolioSignal.id,
      status: 'PROPOSED',
      priority: stoppedVip.length ? 'high' : stopped.length ? 'medium' : 'low',
      title: stoppedVip.length ? 'مراجعة العملاء المهمين المصنفين كمنقطعين' : stopped.length ? 'التحقق من حالات انقطاع العملاء' : 'مراجعة تغير مشتريات العملاء',
      action: recommendedAction,
      why: portfolioSignal.message,
      evidence: portfolioEvidence,
      ownerHint: 'مدير المبيعات / مسؤول حسابات العملاء',
      impact: portfolioSignal.impact,
      expectedOutcome: 'توثيق حالة كل عميل تمت مراجعته وقياس قيمة الشراء المستعادة فعليًا؛ لا يُعد التواصل وحده نتيجة محققة.',
      whyNow: stoppedVip.length ? 'لأن المصدر يضع عملاء من الفئة المهمة ضمن حالة الانقطاع، ويستحق ذلك تحققًا مباشرًا.' : 'لتثبيت خط أساس موثق قبل اعتماد أي تغيير.',
      measurement: 'عدد العملاء المنقطعين الذين تمت مراجعتهم، وعدد من عادوا للشراء، وقيمة مشترياتهم الجديدة مقارنة بخط الأساس.',
      risk: 'قد لا تعكس الحالة آخر تعامل؛ لا يُثبت المصدر سبب الانقطاع أو الاستعادة الفعلية.',
      blocker: 'تحقق من آخر تاريخ شراء وسبب الحالة قبل اعتماد قرار استعادة أو أثر مالي.',
      limitation: 'الأشهر أعمدة فترية وليست سجل فواتير مؤرخًا؛ لا تُفترض العملة أو السببية أو نتيجة الاستعادة.',
    };
    return {
      ...base,
      businessQuestion: stopped.length
        ? 'من العملاء الأعلى قيمةً والمصنّفون في المصدر كمنقطعين، وكيف تغير إجمالي الشراء عبر الأشهر؟'
        : 'كيف تغير إجمالي الشراء عبر الأشهر، ومن أعلى العملاء قيمةً وفق المصدر؟',
      summary: 'تم تحليل ' + customers.length.toLocaleString('ar-YE') + ' سجل عميل و' + monthColumns.length + ' أعمدة شهرية. رُصد ' + stopped.length.toLocaleString('ar-YE') + ' سجلًا بحالة «منقطع»، منها ' + stoppedVip.length.toLocaleString('ar-YE') + ' مصنّفًا ضمن فئة مهمة/VIP. قيمة الإجمالي حسب عمود المصدر: ' + numberLabel(totalPortfolioValue) + '.',
      signals: [portfolioSignal],
      recommendations: [portfolioRecommendation],
      findings: [portfolioFinding, ...base.findings.filter((finding) => finding.id !== portfolioFinding.id)],
      risks: stopped.length ? [portfolioFinding, ...base.risks.filter((finding) => finding.id !== portfolioFinding.id)] : base.risks,
      advisorBrief: {
        ...base.advisorBrief,
        health: stoppedVip.length ? 'REVIEW_REQUIRED' : stopped.length ? 'ATTENTION' : 'HEALTHY',
        headline: portfolioFinding.statement,
        topFinding: portfolioFinding,
        topRisk: stopped.length ? portfolioFinding : base.advisorBrief.topRisk,
        recommendedAction,
        ownerHint: 'مدير المبيعات / مسؤول حسابات العملاء',
        expectedOutcome: 'توثيق حالة كل عميل تمت مراجعته وقياس قيمة الشراء المستعادة فعليًا؛ لا يُعد التواصل وحده نتيجة محققة.',
        measurement: 'عدد العملاء المنقطعين الذين تمت مراجعتهم، وعدد من عادوا للشراء، وقيمة مشترياتهم الجديدة مقارنة بخط الأساس.',
        proofRequirement,
      },
      guidance: {
        ...base.guidance,
        focus: stoppedVip.length ? 'مراجعة انقطاع العملاء المهمين' : 'نشاط العملاء وقيمة الشراء الشهرية',
        inspect: portfolioInspect,
        ownerHint: 'مدير المبيعات / مسؤول حسابات العملاء',
        boundary: 'التصنيفات حالات واردة في المصدر وليست إثباتًا لسبب الانقطاع. لا توجد عملة محددة أو أثر استعادة مثبت دون دليل بعد الإجراء.',
      },
    };
  }

  if (!inventoryShape) return base;

  const stockColumn = findColumn('currentStock', 'current_stock', 'stock', 'الرصيدالحالي', 'الرصيد', 'المخزونالحالي');
  const salesColumn = findColumn('salesQty', 'sales_qty', 'sales', 'كميةالمبيعات', 'صافيالمبيعات');
  const dailyRateColumn = findColumn('dailySalesRate', 'daily_sales_rate', 'معدل البيع اليومي', 'معدل البيع ليومي');
  const stockoutDaysColumn = findColumn('stockoutDays', 'stockout_days', 'الفترة المتوقعة لنفاد الكمية', 'الفترةالمتوقعةلنفادالكمية', 'أيام النفاد');
  const skuColumn = findColumn('productCode', 'product_code', 'sku', 'رقمالصنف', 'كودالصنف');
  const warehouseColumn = findColumn('warehouse', 'المستودع', 'المخزن');
  const documentColumn = findColumn('documentNo', 'invoice_number', 'document_number', 'رقمالمستند', 'رقمالفاتورة');

  if (!stockColumn || !salesColumn) return base;
  if (!dailyRateColumn && !stockoutDaysColumn) return base;

  const rows = dataset.rows.map((row, index) => {
    const stock = Number(valueOf(row, stockColumn));
    const sales = Number(valueOf(row, salesColumn));
    const dailyRate = dailyRateColumn ? Number(valueOf(row, dailyRateColumn)) : NaN;
    const sourceStockoutDays = stockoutDaysColumn ? Number(valueOf(row, stockoutDaysColumn)) : NaN;
    const coverageDays = Number.isFinite(sourceStockoutDays)
      ? sourceStockoutDays
      : Number.isFinite(dailyRate) && dailyRate > 0
        ? stock / dailyRate
        : NaN;
    return {
      index,
      sales,
      stock,
      dailyRate,
      coverageDays,
      sku: String(valueOf(row, skuColumn) ?? 'غير محدد'),
      warehouse: String(valueOf(row, warehouseColumn) ?? 'غير محدد'),
      document: String(valueOf(row, documentColumn) ?? 'ROW-' + (index + 1)),
    };
  }).filter((row) => Number.isFinite(row.stock) && Number.isFinite(row.sales) && row.sales > 0 && Number.isFinite(row.coverageDays) && row.coverageDays >= 0);

  const lowCoverage = rows.filter((row) => row.coverageDays <= 30).sort((a, b) => a.coverageDays - b.coverageDays);
  if (!lowCoverage.length) return base;

  const latest = lowCoverage[0];
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const lowSales = lowCoverage.reduce((sum, row) => sum + row.sales, 0);
  const lowStock = lowCoverage.reduce((sum, row) => sum + row.stock, 0);
  const totalStock = rows.reduce((sum, row) => sum + row.stock, 0);

  const topRisk: BusinessFinding = {
    id: 'preview:inventory:low-coverage',
    kind: 'RISK',
    priority: latest.coverageDays <= 7 ? 'high' : 'medium',
    title: latest.coverageDays <= 7 ? 'نفاد قريب يحتاج تدخلًا' : 'أصناف ذات تغطية قصيرة',
    statement: 'الصنف ' + latest.sku + ' في ' + latest.warehouse + ' لديه تغطية مصدرية تبلغ ' + latest.coverageDays.toFixed(1) + ' يومًا، مع ' + latest.sales + ' مبيعات و' + latest.stock + ' رصيد.',
    value: latest.coverageDays,
    unit: 'days',
    dimensionLabel: 'الصنف',
    dimensionValue: latest.sku,
    evidence: lowCoverage.slice(0, 5).map((row) => row.document + ' · ' + row.sku + ' · تغطية ' + row.coverageDays.toFixed(1) + ' يوم · مبيعات ' + row.sales + ' · رصيد ' + row.stock),
    limitation: 'المصدر لا يثبت مهلة التوريد أو نقطة إعادة الطلب أو كمية شراء؛ لذلك يحدد التحليل الأولوية ولا يخترع كمية.',
    action: 'راجع الأصناف ذات التغطية القصيرة، ثبّت المالك والتوقيت، ثم اعتمد التوريد أو التحويل بعد التحقق من مهلة التوريد ونقطة إعادة الطلب.',
  };

  return {
    ...base,
    businessQuestion: 'أين توجد أصناف معرضة للنفاد خلال 30 يومًا أو أقل؟',
    summary: 'تم فحص ' + dataset.rowCount + ' صفًا من المصدر مباشرة، وظهرت ' + lowCoverage.length + ' صفوف لا تتجاوز تغطتها 30 يومًا.',
    advisorBrief: {
      health: 'REVIEW_REQUIRED',
      headline: topRisk.statement,
      topFinding: null,
      topRisk,
      topOpportunity: null,
      recommendedAction: topRisk.action,
      ownerHint: 'مدير المخزون / المشتريات',
      expectedOutcome: 'خفض عدد الأصناف التي تقع عند 30 يومًا أو أقل بعد المعالجة وإعادة القياس بنفس قاعدة المصدر.',
      measurement: 'نجاح المعالجة = انخفاض عدد الصفوف ذات التغطية ≤ 30 يومًا؛ النطاق المثبت ' + lowCoverage.length + ' صفوف من ' + rows.length + '.',
      proofRequirement: 'المصدر ' + dataset.name + '، ' + dataset.rowCount + ' صفًا، والتوصية مشتقة من فترة النفاد المصدرية أو الرصيد ÷ معدل البيع اليومي.',
    },
    guidance: {
      focus: topRisk.title,
      inspect: [
        lowCoverage.length + ' صفوف بتغطية ≤ 30 يومًا',
        (totalSales > 0 ? ((lowSales / totalSales) * 100).toFixed(1) + '%' : 'غير متاح') + ' من وحدات المبيعات داخل الصفوف المتأثرة',
        (totalStock > 0 ? ((lowStock / totalStock) * 100).toFixed(1) + '%' : 'غير متاح') + ' من الرصيد الحالي داخل الصفوف المتأثرة',
      ],
      ownerHint: 'مدير المخزون / المشتريات',
      boundary: topRisk.limitation,
    },
  };
}

function PreviewIntelligenceCard({ intelligence }: { intelligence: ReportIntelligence }) {
  const brief = intelligence.advisorBrief;
  const healthLabel = brief.health === 'REVIEW_REQUIRED' ? 'يحتاج تدخلًا' : brief.health === 'ATTENTION' ? 'انتباه' : 'مستقر';
  const top = brief.topRisk ?? brief.topFinding ?? brief.topOpportunity;
  return <Card className="border-emerald-200 bg-emerald-50/40">
    <CardHeader
      title="التقرير الاستشاري الأولي"
      subtitle="النتيجة مشتقة مباشرة من صفوف الملف نفسه؛ لا توجد أرقام ملخصة خارج المصدر."
      action={<Badge variant={brief.health === 'REVIEW_REQUIRED' ? 'danger' : brief.health === 'ATTENTION' ? 'warning' : 'success'}>{healthLabel}</Badge>}
    />
    <CardBody>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <div className="text-[10px] font-black tracking-[.08em] text-primary-700">EXECUTIVE JUDGMENT</div>
          <h3 className="mt-2 text-lg font-black text-ink-950">{brief.headline}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-600">{intelligence.businessQuestion}</p>
          {top && <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/50 p-4">
            <div className="text-xs font-black text-ink-700">{top.title}</div>
            <p className="mt-1 text-sm leading-6 text-ink-700">{top.statement}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {top.evidence.slice(0, 3).map((evidence) => <span key={evidence} className="rounded-lg bg-white px-2.5 py-1.5 text-ink-500">{evidence}</span>)}
            </div>
          </div>}
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
            <div className="text-xs font-black text-primary-900">ماذا نفعل الآن؟</div>
            <p className="mt-1 text-sm leading-6 text-primary-900">{brief.recommendedAction ?? 'لا توجد توصية تنفيذية كافية من الحقول المتاحة.'}</p>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-4 text-sm">
            <div><span className="font-black">المالك:</span> {brief.ownerHint}</div>
            <div className="mt-2"><span className="font-black">القياس:</span> {brief.measurement ?? 'يحتاج تعريف مؤشر قبل اعتماد القرار.'}</div>
            <div className="mt-2"><span className="font-black">المتوقع:</span> {brief.expectedOutcome ?? 'لا توجد نتيجة متوقعة مثبتة.'}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        <b>حد الدليل:</b> {brief.proofRequirement} {intelligence.guidance.boundary}
      </div>
    </CardBody>
  </Card>;
}

function downloadCsv(dataset: Dataset) {
  const columns = dataset.columns.map(c => c.name);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [columns, ...dataset.rows.slice(0, 50000).map(row => columns.map(c => row[c]))].map(row => row.map(esc).join(',')).join('\n');
  const blob = new Blob([new TextEncoder().encode('\uFEFF' + body)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${dataset.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 0);
}

export function ExternalFileAnalysisPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const [file, setFile] = useState<{name:string;size:number;format:FileFormat;hash:string}|null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function analyze(selected: File) {
    setLoading(true); setError(null); setDatasets([]); setActive(0);
    try {
      if (selected.size > MAX_FILE_SIZE) throw new Error(`حجم الملف يتجاوز الحد الآمن (${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB)`);
      const buffer = await selected.arrayBuffer();
      const scan = securityScan(selected, buffer);
      if (!scan.passed) throw new Error(scan.issues.join(' — '));
      const detection = detectFormat(selected, buffer);
      if (detection.format === 'unknown') throw new Error('تعذر تحديد صيغة الملف');
      const hash = await computeSHA256(buffer);
      const parsed = await parseFile(buffer, selected.name, detection.format);
      if (!parsed.length) throw new Error('لم يتم العثور على بيانات قابلة للتحليل داخل الملف');
      selectedFileRef.current = selected;
      setFile({ name:selected.name, size:selected.size, format:detection.format, hash });
      setDatasets(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحليل الملف');
    } finally { setLoading(false); }
  }

  const dataset = datasets[active] ?? null;
  const intelligence = useMemo(() => dataset ? buildPreviewIntelligence(dataset) : null, [dataset]);
  const specialty = useMemo(() => dataset ? inferReportSpecialty(dataset) : undefined, [dataset]);
  const customerPortfolio = Boolean(intelligence?.findings.some((finding) => finding.id === 'preview:customer-portfolio:interruption'));
  const genericIntelligence = useMemo(() => dataset ? buildGenericFileIntelligence(dataset, file?.format ?? 'unknown') : null, [dataset, file?.format]);
  const universalIntelligence = useMemo(() => dataset ? buildUniversalReportIntelligence({
    specialty: specialty ?? null,
    archetypeHintId: customerPortfolio ? 'customers.activity' : undefined,
    previewIntelligence: customerPortfolio ? intelligence ?? undefined : undefined,
    generalIntelligence: genericIntelligence ?? undefined,
    rowCount: dataset.rowCount,
    sourceAnalysis: { datasets: [dataset] },
    canonicalRows: dataset.rows.map((data, index) => ({ row_number: index + 1, data })),
    sourcePath: file?.name ?? dataset.name,
    sourceHash: file?.hash ?? null,
  }) : null, [dataset, file, specialty, customerPortfolio, intelligence, genericIntelligence]);
  const summary = useMemo(() => dataset ? {
    mapped: dataset.columns.filter(c => !!c.mappedField).length,
    unmapped: dataset.columns.filter(c => !c.mappedField).length,
    review: dataset.columns.filter(c => c.requiresReview).length,
    issues: dataset.columns.reduce((n,c) => n + c.qualityIssues.length, 0),
  } : null, [dataset]);

  return <div className="ag-file-lab space-y-6" dir="rtl">
    <PageHeader title="مختبر الملفات والبيانات" subtitle="حلّل أي ملف خارجي دون إجباره على نموذج أعمال مسبق، مع إبقاء الحقول الأصلية متاحة للمراجعة." />
    <Card><CardBody>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] items-center">
        <div><div className="flex items-center gap-2"><Sparkles size={18}/><h2 className="font-semibold">ذكاء الملفات الشامل</h2></div><p className="mt-2 text-sm leading-6 text-ink-500">فحص أمني → كشف الصيغة → استخراج → تهيئة تحليلية → مطابقة → جودة → جاهزية للتحليل. هذا المسار تحليلي ولا يكتب سجلات الأعمال تلقائيًا.</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="neutral">كل الأعمدة</Badge><Badge variant="neutral">أنواع البيانات</Badge><Badge variant="neutral">دليل المطابقة</Badge><Badge variant="neutral">إشارات الجودة</Badge><Badge variant="neutral">OCR عربي + إنجليزي</Badge><Badge variant="neutral">بصمة SHA-256</Badge></div></div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={loading} className="btn-primary inline-flex items-center justify-center gap-2 min-w-52"><Upload size={18}/>{loading ? 'جارٍ التحليل...' : 'تحليل أي ملف خارجي'}</button>
      </div>
      <input ref={inputRef} type="file" className="hidden" accept="*/*" onChange={e => { const f=e.target.files?.[0]; if(f) void analyze(f); e.currentTarget.value=''; }}/>
      <div onClick={() => inputRef.current?.click()} className="mt-5 cursor-pointer rounded-2xl border-2 border-dashed border-ink-200 p-8 text-center hover:border-primary-400 transition-colors"><Upload className="mx-auto mb-2 text-primary-500" size={30}/><b>اسحب الملف هنا أو اضغط للاختيار</b><p className="mt-1 text-xs text-ink-400">الحد الآمن {Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB · لا توجد كتابة تلقائية لبيانات الأعمال</p></div>
      {error && <div className="mt-4 rounded-xl bg-danger-50 p-3 text-sm text-danger-700 flex gap-2"><AlertCircle size={17}/>{error}</div>}
    </CardBody></Card>
    {file && datasets.length > 0 && <Card className="border-primary-200 bg-primary-50/40"><CardBody>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-black tracking-[.08em] text-primary-700">NEXT · SMART REPORT</div>
          <div className="mt-1 text-base font-black text-ink-950">تم التعرف على المصدر — لا تتوقف عند أخطاء الجودة</div>
          <p className="mt-1 text-xs leading-5 text-ink-600">الجدول وإشارات الجودة هنا مرحلة فهم فقط. مرّر الملف إلى المسار الكانوني ليُبنى التقرير الذكي المرتبط بالبصمة، ثم تظهر الإشارات والتوصيات والتنبؤ المشروط والإرشادات ومسار القرار.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const selected = selectedFileRef.current;
            if (selected) navigate('/import', { state: { preloadedFile: selected } });
          }}
          className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
        >
          <Sparkles size={16}/> تحويل إلى تقرير ذكي
        </button>
      </div>
    </CardBody></Card>}
    {file && intelligence && <PreviewIntelligenceCard intelligence={intelligence} />}
    {file && genericIntelligence && <GenericFileIntelligenceCard intelligence={genericIntelligence} format={file.format} sourcePath={file.name} sourceHash={file.hash} />}
    {file && <Card><CardBody><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">{fileIcon(file.format)}<div><b>{file.name}</b><div className="text-xs text-ink-400">{FORMAT_LABELS[file.format]} · {file.size.toLocaleString()} بايت · بصمة SHA-256: {file.hash.slice(0,16)}…</div></div></div><Badge variant="success"><ShieldCheck size={13}/> اجتاز الفحص الأمني</Badge></div></CardBody></Card>}
    {file && universalIntelligence && <Card className="overflow-hidden border-primary-100 bg-[linear-gradient(135deg,rgba(247,245,255,.98),rgba(255,255,255,.98)_55%,rgba(255,249,236,.98))]">
      <CardBody>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="section-kicker">مسار القرار · مصدر مربوط</div>
            <h2 className="mt-1 text-lg font-black text-ink-950">من الملف الخام إلى نتيجة قابلة للتنفيذ</h2>
            <p className="mt-1 max-w-3xl text-[11px] leading-5 text-ink-500">المصدر لا يتوقف عند المعاينة: كل مرحلة تحتفظ بالبصمة والدليل، ولا تُعرض نتيجة غير مثبتة كحقيقة.</p>
          </div>
          <button type="button" onClick={() => {
            const selected = selectedFileRef.current;
            if (selected) navigate('/import', { state: { preloadedFile: selected } });
          }} className="btn-primary inline-flex items-center gap-2 whitespace-nowrap">
            <Sparkles size={15}/> تشغيل المسار الكامل
          </button>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {[
            ['01', 'المصدر', 'الملف + SHA-256'],
            ['02', 'الاستخراج', 'صيغة / نص / صفوف'],
            ['03', 'الحقيقة', 'جودة + مطابقة + حدود'],
            ['04', 'الإشارة', 'ماذا يستحق الانتباه؟'],
            ['05', 'التوصية', 'ماذا نفعل ولماذا الآن؟'],
            ['06', 'القرار والعمل', 'قرار → اعتماد → عمل → نتيجة'],
          ].map(([n, title, detail], index, items) => (
            <div key={n} className="relative rounded-xl border border-ink-100 bg-white/85 p-3 shadow-sm">
              <div className="text-[9px] font-black tracking-[.12em] text-primary-700">{n}</div>
              <div className="mt-1 text-xs font-black text-ink-900">{title}</div>
              <div className="mt-1 text-[10px] leading-5 text-ink-400">{detail}</div>
              {index < items.length - 1 && <ArrowLeft className="absolute -left-2.5 top-1/2 hidden -translate-y-1/2 text-primary-300 xl:block" size={14}/>}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>}
    {file && universalIntelligence && <details open className="progressive-disclosure rounded-[20px] border border-ink-200 bg-white shadow-card">
      <summary className="cursor-pointer list-none px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div><div className="section-kicker">تفاصيل التحليل</div><div className="mt-1 text-base font-black text-ink-950">كيف وصل النظام إلى هذه النتيجة؟</div><div className="mt-1 text-[10px] leading-5 text-ink-500">المسار الكامل مع الإشارات والأدلة ظاهر مباشرة، ويمكن طيّه بعد المراجعة.</div></div>
          <span className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-[10px] font-black text-ink-600">ظاهر الآن · اضغط للطي</span>
        </div>
      </summary>
      <div className="border-t border-ink-100 p-3 lg:p-4"><UniversalIntelligenceChain result={universalIntelligence}/></div>
    </details>}
    {datasets.length > 1 && <Card><CardBody><div className="flex gap-2 overflow-x-auto">{datasets.map((d,i)=><button key={`${d.id}-${i}`} type="button" aria-pressed={i===active} onClick={()=>setActive(i)} className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-semibold ${i===active?'border-primary-500 bg-primary-50 text-primary-700':'border-ink-200 bg-white text-ink-600'}`}>ورقة/مجموعة {i+1}: {d.name}</button>)}</div></CardBody></Card>}
    {dataset && <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">{[['الصفوف',dataset.rowCount],['الأعمدة',dataset.columnCount],['المعيّنة',summary?.mapped??0],['غير المعيّنة',summary?.unmapped??0],['مشاكل الجودة',summary?.issues??0]].map(([label,value])=><Card key={String(label)}><CardBody><div className="text-xs text-ink-400">{label}</div><div className="mt-1 text-xl font-bold">{Number(value).toLocaleString()}</div></CardBody></Card>)}</div>
      <Card><CardHeader title="ذكاء المخطط" subtitle="كل حقل يحتفظ بهويته الأصلية ويُعامل كمرشح مستقل للمطابقة والتحليل" action={<button type="button" onClick={()=>downloadCsv(dataset)} className="btn-secondary text-xs inline-flex items-center gap-1"><Download size={14}/> تصدير البيانات المحللة</button>}/><CardBody><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-ink-100"><th className="p-2 text-right">الحقل الأصلي</th><th className="p-2 text-right">الحقل القياسي</th><th className="p-2 text-right">النوع</th><th className="p-2 text-right">الثقة</th><th className="p-2 text-right">الفرادة</th><th className="p-2 text-right">القيم الفارغة</th></tr></thead><tbody>{dataset.columns.map(c=><tr key={c.name} className="border-b border-ink-50"><td className="p-2 font-medium">{c.name}</td><td className="p-2">{c.mappedField||<span className="text-ink-400">غير معين — محفوظ</span>}</td><td className="p-2">{c.dataType}</td><td className="p-2">{c.mappingConfidence}%</td><td className="p-2">{Math.round(c.uniqueRatio*100)}%</td><td className="p-2">{c.nullCount.toLocaleString()}</td></tr>)}</tbody></table></div></CardBody></Card>
      <Card><CardHeader title="المعاينة" subtitle={`عرض ${Math.min(dataset.preview.length, 50)} صفًا مع ${dataset.columnCount} عمودًا`}/><CardBody><div className="overflow-x-auto"><DataTable columns={dataset.columns.map(c=>({key:c.name,label:c.name,render:(r:any)=>String(r[c.name]??'')}))} data={dataset.preview.slice(0,50)} emptyMessage="لا توجد صفوف للعرض"/></div></CardBody></Card>
      <Card><CardHeader title="إشارات الجودة والتوصيات"/><CardBody><div className="grid gap-2 md:grid-cols-2">{dataset.columns.flatMap(c=>c.qualityIssues.map(issue=><div key={`${c.name}-${issue}`} className="flex gap-2 rounded-xl bg-warning-50 p-3 text-xs text-warning-800"><AlertCircle size={14}/><span><b>{c.name}</b>: {issue}</span></div>))}{!dataset.columns.some(c=>c.qualityIssues.length)&&<div className="flex gap-2 text-sm text-success-700"><CheckCircle2 size={16}/> لا توجد إشارات جودة على الحقول المفحوصة.</div>}</div></CardBody></Card>
      <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-5"><div className="flex items-center gap-2 font-semibold"><BarChart3 size={18}/> قرار المعالجة</div><p className="mt-2 text-sm leading-6 text-ink-600">{summary?.unmapped ? `تم اكتشاف ${summary.unmapped} حقل غير معيّن. هذه الحقول لا تُحذف؛ تبقى متاحة للتحليل والتعيين اللاحق.` : 'المخطط المكتشف قابل للربط مع النموذج القياسي، مع بقاء المصدر الأصلي محفوظًا.'}</p></div>
    </>}
    {loading && <Card><CardBody><div className="py-10 text-center"><Loader2 className="mx-auto animate-spin text-primary-500" size={30}/><p className="mt-3 text-sm">جارٍ بناء ملف التعريف والتحليل…</p></div></CardBody></Card>}
  </div>;
}
