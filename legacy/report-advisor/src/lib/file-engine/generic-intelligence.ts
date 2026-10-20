import type { Dataset } from './types.js';
import { parseNumber } from './normalizer.js';
import {
  deriveReportIntelligence,
  type BusinessFinding,
  type ReportIntelligence,
  type ReportRecommendation,
  type ReportSignal,
} from '../report-intelligence/report-smart-insights.js';

const RISK_TERMS = [
  'خطر', 'مخاطر', 'تأخير', 'متأخر', 'عجز', 'نقص', 'مشكلة', 'تنبيه', 'حرج', 'نفاد', 'فقد', 'انحراف',
  'risk', 'delay', 'delayed', 'shortage', 'issue', 'warning', 'critical', 'overdue', 'loss', 'deficit',
];
const ACTION_TERMS = [
  'يجب', 'يلزم', 'إجراء', 'توصية', 'اعتماد', 'تنفيذ', 'مراجعة', 'متابعة', 'قرار', 'الموافقة',
  'must', 'need', 'action', 'recommendation', 'approve', 'review', 'follow up', 'decision',
];
const STOP_WORDS = new Set([
  'هذا', 'هذه', 'ذلك', 'تلك', 'من', 'في', 'على', 'عن', 'إلى', 'مع', 'هو', 'هي', 'و', 'او', 'أو', 'ثم', 'كما',
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was', 'were', 'into', 'our', 'your',
]);

function text(value: unknown): string { return String(value ?? '').trim(); }
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي');
}
function datasetText(dataset: Dataset): string[] {
  return (dataset.rows ?? []).flatMap((row) => {
    const values = Object.values(row).filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
    return [values.map(text).join(' | ')];
  }).filter(Boolean);
}
const MAX_INLINE_EVIDENCE_LINES = 100;

function matchingLineCount(lines: string[], terms: string[]): number {
  return lines.reduce((count, line) => count + (terms.some((term) => normalize(line).includes(normalize(term))) ? 1 : 0), 0);
}

function matchingLines(lines: string[], terms: string[]): string[] {
  const matched: string[] = [];
  for (const line of lines) {
    if (!terms.some((term) => normalize(line).includes(normalize(term)))) continue;
    matched.push(line);
    if (matched.length >= MAX_INLINE_EVIDENCE_LINES) break;
  }
  return matched;
}
function countMatches(lines: string[], terms: string[]): number {
  return lines.reduce((count, line) => count + terms.filter((term) => normalize(line).includes(normalize(term))).length, 0);
}
function topKeywords(lines: string[]): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>();
  for (const line of lines) for (const raw of line.match(/[\p{L}\p{N}]{4,}/gu) ?? []) {
    const word = normalize(raw);
    if (!word || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([word, count]) => ({ word, count }));
}
function numericEvidence(lines: string[]): string[] {
  const result: string[] = [];
  const numericRegex = /(?:[$€£¥]|ر\.?س|ريال|دولار|USD|EUR|SAR|YER)?\s*[-+]?\d[\d,\u066B\u066C.]*/gi;
  for (const line of lines) {
    const values = line.match(numericRegex) ?? [];
    if (values.length) result.push(line + ' · أرقام مرصودة: ' + values.slice(0, 5).join(', '));
    if (result.length >= MAX_INLINE_EVIDENCE_LINES) break;
  }
  return result;
}
function genericRecommendation(evidence: string[], context: string): ReportRecommendation {
  return {
    id: 'generic:file:review', status: 'PROPOSED', priority: evidence.length ? 'medium' : 'low',
    title: 'مراجعة الملف وتحويل الإشارات إلى قرار موثق',
    action: 'راجع الأدلة المحددة في الملف، ثبّت المالك والمطلوب، ثم حوّل ما يثبت إلى قرار أو مهمة قابلة للقياس.',
    why: context, evidence, ownerHint: 'المسؤول التشغيلي المناسب لمحتوى الملف',
    impact: 'التحليل يحدد مواضع الانتباه؛ الأثر المالي أو التشغيلي لا يُثبت من النص وحده.',
    expectedOutcome: 'إزالة الغموض عن البنود ذات الصلة وربطها بقرار أو إجراء قابل للمتابعة.',
    whyNow: evidence.length ? 'ظهرت إشارات نصية مباشرة تستحق المراجعة.' : 'المصدر يحتاج فحصًا دلاليًا قبل اعتماد أي حكم.',
    measurement: 'عدد البنود التي تم تأكيدها + حالة القرار/الإجراء المرتبط بكل بند.',
    risk: 'قد تكون اللغة وصفية أو سياقية؛ لا تُعامل الإشارة النصية كإثبات سببي.',
    blocker: 'لا يوجد أثر تنفيذي مثبت في الملف نفسه.',
    limitation: 'الاستنتاج العام مبني على النص/القيم المتاحة؛ لا توجد دلالة تجارية مفترضة من اسم الملف فقط.',
  };
}
type StructuredTableProfile = {
  summary: string;
  headline: string;
  finding: BusinessFinding;
  signals: ReportSignal[];
  recommendations: ReportRecommendation[];
  inspect: string[];
  statusCount: number;
};

function profileStructuredTable(dataset: Dataset): StructuredTableProfile | null {
  if (dataset.rowCount < 2 || dataset.columnCount < 2) return null;

  // Plain documents are represented as synthetic {line_number, text} rows.
  // Treating that adapter shape as a business table hides the actual source text.
  const rawHeaders = dataset.columns.map((column) =>
    String(column.name ?? '').toLowerCase().normalize('NFKC').replace(/[\s_.-]+/g, ''),
  );
  const hasLineOrdinal = rawHeaders.some((header) => ['linenumber', 'lineno', 'lineindex', 'rowindex'].includes(header));
  const hasLineContent = rawHeaders.some((header) => ['text', 'content', 'body', 'paragraph', 'rawtext', 'pagetext'].includes(header));
  if (dataset.columnCount <= 2 && hasLineOrdinal && hasLineContent) return null;
  const headerKey = (column: Dataset['columns'][number]) => normalize(column.mappedField || column.name).replace(/[()]/g, '');
  const valueFor = (row: Record<string, unknown>, column: Dataset['columns'][number]) =>
    row[column.name] ?? row[column.mappedField ?? ''];
  const numericValue = (value: unknown): number | null => {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const raw = String(value).trim();
    // The parser normally cleans numeric cells, but persisted/partial datasets can
    // retain locale-formatted strings. Use the shared Arabic/Western number parser
    // rather than turning those valid source values into missing measurements.
    const plain = Number(raw);
    if (Number.isFinite(plain)) return plain;
    return parseNumber(raw);
  };
  const numberLabel = (value: number) => value.toLocaleString('ar-YE', { maximumFractionDigits: 2 });
  const find = (...aliases: string[]) => dataset.columns.find((column) => {
    const key = headerKey(column);
    return aliases.some((alias) => key.includes(normalize(alias).replace(/[()]/g, '')));
  });
  const entityColumn = find('customer_name', 'supplier_name', 'product_name', 'اسم العميل', 'اسم المورد', 'اسم المنتج', 'اسم الصنف', 'العميل', 'المورد');
  const totalColumn = find('total', 'grand total', 'total amount', 'net_amount', 'الإجمالي الكلي', 'اجمالي الفاتورة', 'الإجمالي');
  // Customer specialization must be supported by raw source headers, not guessed mappings.
  const customerAliases = ['customer_name', 'customer name', 'client_name', 'client name', 'اسم العميل', 'اسم الزبون', 'العميل', 'الزبون']
    .map((alias) => normalize(alias).replace(/[()]/g, '').replace(/[\s-]+/g, '_'));
  const customerColumn = dataset.columns.find((column) => {
    const rawHeader = normalize(column.name).replace(/[()]/g, '').replace(/[\s-]+/g, '_');
    return customerAliases.some((alias) => rawHeader.includes(alias));
  });
  const statusColumn = find('customer_status', 'status', 'حالة الزبون', 'حالة العميل', 'الحالة');
  const monthOrder = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const monthColumns = dataset.columns.map((column) => ({ column, key: headerKey(column) }))
    .filter(({ column, key }) => key.startsWith('monthly_sales_') || /^(يناير|فبراير|مارس|ابريل|أبريل|مايو|يونيو|يوليو|اغسطس|أغسطس|سبتمبر|اكتوبر|أكتوبر|نوفمبر|ديسمبر)$/.test(normalize(column.name)))
    .sort((a, b) => {
      const index = (key: string) => monthOrder.findIndex((month) => key.includes(month));
      return index(a.key) - index(b.key);
    });
  const numericColumns = dataset.columns.filter((column) =>
    ['integer','decimal','currency','percentage'].includes(column.dataType),
  );
  const statusCounts = new Map<string, number>();
  if (statusColumn) {
    for (const row of dataset.rows) {
      const value = String(valueFor(row, statusColumn) ?? '').trim();
      if (value) statusCounts.set(value, (statusCounts.get(value) ?? 0) + 1);
    }
  }
  const stoppedCount = [...statusCounts.entries()].reduce((sum, [label, count]) =>
    /منقطع|متوقف|inactive|churn|lost/i.test(normalize(label)) ? sum + count : sum, 0);
  const stoppedSamples = statusColumn && entityColumn
    ? dataset.rows.filter((row) => /منقطع|متوقف|inactive|churn|lost/i.test(normalize(String(valueFor(row, statusColumn) ?? '')))).slice(0, 5)
      .map((row) => String(valueFor(row, entityColumn) ?? 'سجل') + ' · ' + String(valueFor(row, statusColumn) ?? ''))
    : [];
  const monthStats = monthColumns.map(({ column }) => ({
    label: column.name,
    total: dataset.rows.reduce((sum, row) => sum + (numericValue(valueFor(row, column)) ?? 0), 0),
    active: dataset.rows.filter((row) => (numericValue(valueFor(row, column)) ?? 0) > 0).length,
  }));
  const latest = monthStats[monthStats.length - 1];
  const previous = monthStats.length > 1 ? monthStats[monthStats.length - 2] : undefined;
  const change = previous && latest && previous.total !== 0 ? ((latest.total - previous.total) / Math.abs(previous.total)) * 100 : null;
  const topRecords = entityColumn && totalColumn
    ? [...dataset.rows].map((row) => ({ name: String(valueFor(row, entityColumn) ?? '').trim(), value: numericValue(valueFor(row, totalColumn)) }))
      .filter((item) => item.name && item.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .slice(0, 5)
    : [];
  // Profile every numeric field from every source row. Do not silently omit
  // later measures in wide workbooks because the first fields happened to be numeric.
  const numericSummary = numericColumns.map((column) => {
    const observed = dataset.rows
      .map((row, index) => ({ rowNumber: index + 1, value: numericValue(valueFor(row, column)) }))
      .filter((item): item is { rowNumber: number; value: number } => item.value !== null);
    const values = observed.map((item) => item.value);
    const missingCount = Math.max(0, dataset.rows.length - observed.length);
    if (!values.length) {
      return 'المقياس «' + column.name + '»: لا توجد قيم رقمية مقروءة · صفوف المصدر ' + dataset.rows.length
        + ' · فارغ/غير رقمي ' + missingCount;
    }
    const sum = values.reduce((total, value) => total + value, 0);
    const min = values.reduce((current, value) => Math.min(current, value), values[0]);
    const max = values.reduce((current, value) => Math.max(current, value), values[0]);
    const mean = sum / values.length;
    const minRow = observed.find((item) => item.value === min)?.rowNumber;
    const maxRow = observed.find((item) => item.value === max)?.rowNumber;
    return 'المقياس «' + column.name + '»: قيم رقمية ' + values.length + '/' + dataset.rows.length
      + ' · فارغ/غير رقمي ' + missingCount
      + ' · المجموع الحسابي ' + numberLabel(sum)
      + ' · المتوسط الحسابي ' + numberLabel(mean)
      + ' · الأدنى ' + numberLabel(min) + ' (سجل ' + String(minRow ?? 'غير محدد') + ')'
      + ' · الأعلى ' + numberLabel(max) + ' (سجل ' + String(maxRow ?? 'غير محدد') + ')';
  });
  const statusSummary = [...statusCounts.entries()].sort((a, b) => b[1] - a[1])
    .map(([label, count]) => label + ': ' + count.toLocaleString('ar-YE'));
  const portfolioLike = Boolean(customerColumn && statusColumn && (totalColumn || monthColumns.length >= 3));
  const totalValue = totalColumn
    ? dataset.rows.reduce((sum, row) => sum + (numericValue(valueFor(row, totalColumn)) ?? 0), 0)
    : null;
  const totalMismatchCount = rowsWithMonthlyAndStatedTotalPlaceholder(dataset, totalColumn, monthColumns, valueFor, numericValue);
  const topEvidence = topRecords.map((item) => item.name + ' · ' + totalColumn?.name + ': ' + numberLabel(item.value ?? 0));
  const inspect = [
    'الصفوف ' + dataset.rowCount.toLocaleString('ar-YE') + ' · الأعمدة ' + dataset.columnCount.toLocaleString('ar-YE'),
    'حقول رقمية/قابلة للقياس: ' + numericColumns.length.toLocaleString('ar-YE'),
    ...numericSummary,
    ...(portfolioLike ? ['ملف نشاط العملاء: ربط الحالة والقياسات الشهرية والإجمالي من العناوين المرصودة', 'حالة منقطع في المصدر: ' + stoppedCount.toLocaleString('ar-YE')] : []),
    ...(statusSummary.length ? ['توزيع ' + statusColumn?.name + ': ' + statusSummary.join(' · ')] : []),
    ...(totalValue !== null ? ['مجموع ' + totalColumn?.name + ': ' + numberLabel(totalValue) + ' (العملة كما في المصدر/غير مفترضة)'] : []),
    ...(portfolioLike ? ['فحص الاتساق: ' + totalMismatchCount.toLocaleString('ar-YE') + ' سجلًا يختلف فيه الإجمالي عن مجموع الأشهر بأكثر من 1%'] : []),
    ...monthStats.map((month) => month.label + ': مجموع ' + numberLabel(month.total) + ' · سجلات بقيمة موجبة ' + month.active.toLocaleString('ar-YE')),
    ...(topEvidence.length ? ['أعلى السجلات حسب ' + totalColumn?.name + ': ' + topEvidence.join(' · ')] : []),
    ...(change !== null && latest && previous ? ['التغير من ' + previous.label + ' إلى ' + latest.label + ': ' + (change >= 0 ? '+' : '') + numberLabel(change) + '%'] : []),
  ];
  const summary = portfolioLike
    ? 'تحليل جدولي: ' + dataset.rowCount.toLocaleString('ar-YE') + ' سجلًا، ' + dataset.columnCount + ' عمودًا؛ ' + (statusColumn?.name ?? 'حالة') + ' يحتوي ' + stoppedCount.toLocaleString('ar-YE') + ' سجلًا مصنفًا كمنقطع/متوقف ضمن قيم المصدر. ' + (totalValue !== null ? ' مجموع ' + totalColumn?.name + ' = ' + numberLabel(totalValue) + '.' : '')
    : 'تحليل جدولي فعلي: ' + dataset.rowCount.toLocaleString('ar-YE') + ' سجلًا و' + dataset.columnCount + ' عمودًا؛ جرى تلخيص ' + numericColumns.length + ' حقلًا رقميًا/قابلًا للقياس وعرض توزيع الحقول التصنيفية المتاحة.';
  const headline = portfolioLike && stoppedCount
    ? 'ملف نشاط العملاء: رُصدت ' + stoppedCount.toLocaleString('ar-YE') + ' سجلات تحمل حالة انقطاع/توقف كما وردت في المصدر؛ يلزم التحقق من تعريف الحالة وتاريخ آخر تعامل.'
    : portfolioLike
      ? 'تم تحليل ملف نشاط العملاء وربط قيم الإجمالي والتصنيف وحالة العميل والأشهر الموجودة في المصدر.'
      : 'تم بناء ملخص للجدول من قيمه الفعلية، مع فصل القياسات الرقمية عن التصنيفات النصية.';
  const finding: BusinessFinding = {
    id: portfolioLike ? 'generic:table:customer-portfolio' : 'generic:table:profile',
    kind: portfolioLike && stoppedCount ? 'RISK' : 'FINDING',
    priority: portfolioLike && stoppedCount ? 'high' : 'medium',
    title: portfolioLike ? 'ملف نشاط العملاء' : 'ملخص الجدول المستخرج',
    statement: headline,
    evidence: [...statusSummary, ...topEvidence, ...monthStats.map((month) => month.label + ': ' + numberLabel(month.total))],
    limitation: 'هذا الوصف مشتق من القيم والعناوين الظاهرة؛ لا يفترض عملة أو سببًا أو أثرًا غير موجود في الملف.',
    action: portfolioLike && stoppedCount
      ? 'راجع عينة السجلات المصنفة بالانقطاع وتحقق من آخر تعامل قبل اعتماد قائمة استعادة العملاء.'
      : 'راجع مجموعات القيم وأعلى/أدنى القياسات وثبّت تعريف الأعمدة قبل اعتماد أي أثر تجاري.',
  };
  const signals: ReportSignal[] = [{
    id: 'generic:table:structure',
    severity: 'low',
    title: 'تم تحليل بنية الجدول وقياساته',
    message: 'تم فحص ' + dataset.rowCount.toLocaleString('ar-YE') + ' صفًا و' + dataset.columnCount + ' عمودًا؛ القياسات المعروضة محسوبة من القيم الموجودة.',
    evidence: inspect,
    affectedRows: dataset.rowCount,
    soWhat: 'يوفر هذا ملخصًا يمكن تتبعه إلى الحقول والصفوف الأصلية بدل الاقتصار على اقتباسات من النص.',
    impact: 'لا يُثبت أثرًا ماليًا أو سببيًا دون سياق عمل موثق.',
    ownerHint: 'مالك التقرير أو مسؤول البيانات',
    priority: 'P3',
    priorityReason: ['rows=' + dataset.rowCount, 'columns=' + dataset.columnCount],
  }];
  if (portfolioLike && stoppedCount > 0) signals.push({
    id: 'generic:table:source-status',
    severity: stoppedCount / dataset.rowCount >= 0.2 ? 'high' : 'medium',
    title: 'حالات انقطاع/توقف واردة في المصدر',
    message: 'رُصدت ' + stoppedCount.toLocaleString('ar-YE') + ' سجلات تحمل تصنيف انقطاع/توقف. هذا تعداد للتصنيف الموجود وليس إثباتًا لسبب الانقطاع.',
    evidence: [...statusSummary, ...stoppedSamples],
    affectedRows: stoppedCount,
    soWhat: 'يمكن توجيه المراجعة إلى هذه السجلات بعد التحقق من تاريخ آخر تعامل وتعريف الحالة.',
    impact: 'القيمة المفقودة أو المبيعات المستعادة غير مثبتة من هذه الحالة وحدها.',
    ownerHint: 'المالك الوظيفي لحسابات العملاء',
    priority: stoppedCount / dataset.rowCount >= 0.2 ? 'P1' : 'P2',
    priorityReason: ['source_status_count=' + stoppedCount, 'source_rows=' + dataset.rowCount],
  });
  const recommendations: ReportRecommendation[] = [{
    id: portfolioLike ? 'generic:table:review-status' : 'generic:table:validate-profile',
    status: 'PROPOSED',
    priority: portfolioLike && stoppedCount ? 'high' : 'medium',
    title: portfolioLike ? 'تحقق من حالات العملاء قبل الإجراء' : 'اعتماد تعريفات القياس قبل القرار',
    action: portfolioLike && stoppedCount
      ? 'تحقق من آخر فاتورة وتاريخ شراء وتعريف «منقطع» لكل سجل، ثم وثّق نتيجة المراجعة قبل بدء إجراء استعادة.'
      : 'راجع تعريف الحقول الرقمية والتصنيفية، ثم ثبّت المؤشرات ذات الصلة بسؤال العمل قبل تحويلها إلى قرار.',
    why: headline,
    evidence: [...statusSummary, ...stoppedSamples, ...topEvidence],
    ownerHint: portfolioLike ? 'مدير المبيعات / مسؤول حسابات العملاء' : 'مالك التقرير أو مسؤول البيانات',
    impact: 'لا يُدّعى أثر مالي قبل وجود قياس بعد التنفيذ.',
    expectedOutcome: 'سجلات مصنفة ومراجعة مع قرار قابل للتتبع وقياس قبل/بعد.',
    whyNow: 'التصنيفات والقيم موجودة أصلًا في المصدر ويمكن التحقق منها دون افتراض سبب.',
    measurement: 'عدد السجلات التي تمت مراجعتها، والتغييرات المؤكدة في المؤشر المختار بعد التنفيذ.',
    risk: 'قد يكون التصنيف قديمًا أو معرفًا بطريقة مختلفة داخل الجهة.',
    blocker: 'تحتاج الحالة إلى تعريف داخلي وتاريخ آخر تعامل لإثبات الانقطاع الفعلي.',
    limitation: 'النتائج وصفية ومشتقة من القيم المرصودة فقط؛ لا توجد مقارنة خارجية أو عملة مفترضة.',
  }];
  if (portfolioLike && totalMismatchCount > 0) {
    recommendations.push({
      id: 'generic:table:reconcile-totals', status: 'PROPOSED', priority: 'medium',
      title: 'طابق الإجمالي مع مجموع الفترات', action: 'أعد حساب مجموع الفترات لكل سجل وقارنه بحقل الإجمالي؛ راجع الفروق المتجاوزة لحد السماح قبل اعتماد أرقام التقرير.',
      why: 'وجود الإجمالي مع أعمدة شهرية يتيح اختبار اتساق حسابي من نفس المصدر.',
      evidence: inspect.filter((item) => item.includes('إجمالي') || item.includes('فحص الاتساق')).slice(0, 4),
      ownerHint: 'المحاسبة / مالك التقرير', impact: 'تصحيح الفروق المثبتة قبل اعتماد المجموع.', expectedOutcome: 'إجمالي يمكن إعادة احتسابه من تفاصيل الفترات.',
      whyNow: 'المصدر يحتوي الإجمالي والتفاصيل الشهرية معًا.', measurement: 'عدد السجلات التي تجاوز فرقها حد السماح قبل التصحيح وبعده.',
      risk: 'قد تعتمد بعض التقارير نطاق فترات أو قواعد استثناء مختلفة.', blocker: 'تعريف حدود المجموع والإعفاءات غير مرفق.', limitation: 'الاختبار الحسابي لا يثبت صحة المعاملة الأصلية.',
    });
  }
  if (portfolioLike && change !== null && latest && previous) recommendations.push({
    id: 'generic:table:review-monthly-change', status: 'PROPOSED',
    priority: Math.abs(change) >= 20 ? 'high' : 'medium',
    title: 'راجع تغير آخر فترتين في المصدر',
    action: 'تحقق من سبب تغير الإجمالي بين ' + previous.label + ' و' + latest.label + ' واربط التفسير بفواتير/تعاملات الفترة قبل اعتماده كاتجاه مستمر.',
    why: 'تم حساب التغير من إجمالي القيم في عمودي الفترتين الموجودين.',
    evidence: [previous.label + ': ' + numberLabel(previous.total), latest.label + ': ' + numberLabel(latest.total), 'التغير المحسوب: ' + (change >= 0 ? '+' : '') + numberLabel(change) + '%'],
    ownerHint: 'مدير المبيعات / المحلل المالي', impact: 'يساعد على توجيه المراجعة ولا يثبت سبب التغير.',
    expectedOutcome: 'تفسير موثق للفترة وتحديد ما إذا كان التغير يحتاج متابعة.',
    whyNow: 'آخر فترتين متاحتين تسمحان بقياس تغيير وصفي مباشر.',
    measurement: 'إعادة حساب التغير على فترات متقابلة ومقارنته بعدد الفواتير/العملاء النشطين.',
    risk: 'قد تختلف أطوال الفترات أو يتأثر الإجمالي بالموسمية.', blocker: 'لا توجد بيانات تفسيرية للأسباب في الجدول وحده.',
    limitation: 'اتجاه فترتين ليس تنبؤًا ولا يثبت سببًا.',
  });
  return { summary, headline, finding, signals, recommendations, inspect, statusCount: stoppedCount };
}

function rowsWithMonthlyAndStatedTotalPlaceholder(
  dataset: Dataset,
  totalColumn: Dataset['columns'][number] | undefined,
  monthColumns: Array<{ column: Dataset['columns'][number]; key: string }>,
  valueFor: (row: Record<string, unknown>, column: Dataset['columns'][number]) => unknown,
  numericValue: (value: unknown) => number | null,
): number {
  if (!totalColumn || !monthColumns.length) return 0;
  return dataset.rows.filter((row) => {
    const stated = numericValue(valueFor(row, totalColumn));
    const monthlyValues = monthColumns.map(({ column }) => numericValue(valueFor(row, column)));
    if (stated === null || !monthlyValues.some((value) => value !== null)) return false;
    const monthly = monthlyValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    return Math.abs(stated - monthly) > Math.max(1, Math.abs(stated) * 0.01);
  }).length;
}

export function buildGenericFileIntelligence(dataset: Dataset, format: string): ReportIntelligence {
  const lines = datasetText(dataset);
  const allText = lines.join('\n');
  const words = allText.split(/\s+/).filter(Boolean);
  const riskLines = matchingLines(lines, RISK_TERMS);
  const actionLines = matchingLines(lines, ACTION_TERMS);
  const riskLineCount = matchingLineCount(lines, RISK_TERMS);
  const actionLineCount = matchingLineCount(lines, ACTION_TERMS);
  const numericLineCount = lines.filter((line) =>
    /(?:[$€£¥]|ر\.?س|ريال|دولار|USD|EUR|SAR|YER)?\s*[-+]?\d[\d,\u066B\u066C.]*/i.test(line),
  ).length;
  const numbers = numericEvidence(lines);
  const keywords = topKeywords(lines);
  const riskCount = countMatches(lines, RISK_TERMS);
  const actionCount = countMatches(lines, ACTION_TERMS);
  const dateCount = (allText.match(/\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g) ?? []).length;
  const base = deriveReportIntelligence({ specialty: null, rowCount: dataset.rowCount, sourceAnalysis: { datasets: [dataset] }, canonicalRows: dataset.rows.map((data, index) => ({ row_number: index + 1, data })) });
  const tableProfile = profileStructuredTable(dataset);
  const signals: ReportSignal[] = tableProfile ? [...tableProfile.signals] : [];
  if (riskLines.length) {
    const severity = riskCount >= 5 ? 'high' : riskCount >= 2 ? 'medium' : 'low';
    signals.push({
      id: 'generic:file:risk-language', severity, title: 'إشارات مخاطر أو استثناءات داخل المحتوى',
      message: 'رُصدت ' + riskCount + ' مطابقات لكلمات المخاطر في ' + riskLineCount + ' سطرًا من المصدر ضمن ' + lines.length + ' سطرًا قابلاً للفحص.'
        + (riskLineCount > riskLines.length ? ' تعرض الأدلة أول ' + riskLines.length + ' سطرًا من أصل ' + riskLineCount + '.' : ''),
      evidence: riskLines, affectedRows: riskLineCount,
      soWhat: 'هذه البنود تستحق مراجعة مباشرة وربطها بمصدرها أو إجراءها، لكنها ليست إثباتًا سببيًا بحد ذاتها.',
      impact: 'الأثر غير مثبت ماليًا/تشغيليًا من المحتوى وحده.', ownerHint: 'المسؤول عن الموضوع المذكور في الملف',
      priority: severity === 'high' ? 'P1' : 'P2', priorityReason: ['risk_term_matches=' + riskCount, 'source_lines=' + riskLineCount, 'evidence_lines_shown=' + riskLines.length],
    });
  }
  if (actionLines.length) {
    signals.push({
      id: 'generic:file:action-language', severity: riskLines.length ? 'medium' : 'low', title: 'لغة قرار أو إجراء داخل الملف',
      message: 'رُصدت ' + actionCount + ' مطابقات لكلمات الإجراء في ' + actionLineCount + ' سطرًا من المصدر.'
        + (actionLineCount > actionLines.length ? ' تعرض الأدلة أول ' + actionLines.length + ' سطرًا من أصل ' + actionLineCount + '.' : ''),
      evidence: actionLines, affectedRows: actionLineCount,
      soWhat: 'يوجد محتوى يمكن تحويله إلى قائمة إجراءات أو قرارات موثقة بدل بقائه نصًا ساكنًا.',
      impact: 'لم يُثبت التنفيذ الفعلي من الملف وحده.', ownerHint: 'المسؤول الوظيفي المرتبط بالإجراء',
      priority: riskLines.length ? 'P2' : 'P3', priorityReason: ['action_term_matches=' + actionCount, 'source_lines=' + actionLineCount, 'evidence_lines_shown=' + actionLines.length],
    });
  }
  const genericFinding: BusinessFinding = {
    id: 'generic:file:content-profile', kind: riskLines.length ? 'RISK' : actionLines.length ? 'FINDING' : 'OPPORTUNITY',
    priority: riskLines.length ? 'high' : 'medium',
    title: 'بروفايل المحتوى العام',
    statement: 'الملف من نوع ' + format + ' ويحتوي ' + lines.length.toLocaleString('ar-YE') + ' وحدة نصية قابلة للفحص، '
      + words.length.toLocaleString('ar-YE') + ' كلمة تقريبًا، ' + dateCount + ' تواريخ، و'
      + numericLineCount + ' أسطر تحتوي أرقامًا؛ أمثلة الأرقام المعروضة: ' + numbers.length + '.',
    evidence: [...riskLines, ...actionLines, ...numbers],
    limitation: 'هذا تحليل عام للمحتوى، وليس تصنيفًا تجاريًا مفترضًا.',
    action: riskLines.length ? 'راجع بنود المخاطر المقتبسة واربط كل بند بمالك ومصدر وقرار.' : 'حدّد الغرض التجاري من الملف ثم اربط الحقول/الفقرات ذات الصلة بمؤشر أو قرار.',
  };
  const recommendation = genericRecommendation([...riskLines, ...actionLines], riskLines.length ? 'ظهرت عبارات مرتبطة بمخاطر/استثناءات داخل المصدر.' : 'الملف لا يثبت سياقه التجاري تلقائيًا، لذلك يبدأ التحليل من المحتوى نفسه.');
  const keywordEvidence = keywords.map((item) => item.word + ':' + item.count).join(' · ');
  return {
    ...base,
    businessQuestion: tableProfile
      ? 'ما أهم القياسات والفئات في هذا الجدول، وأي استثناءات تستحق المراجعة قبل القرار؟'
      : 'ماذا يقول هذا الملف فعليًا، وما الإشارات التي تستحق انتباهًا أو إجراءً؟',
    summary: tableProfile
      ? tableProfile.summary
        + (riskLineCount ? ' رُصدت إشارات لغوية مرتبطة بالمخاطر في ' + riskLineCount + ' سطرًا.' : '')
        + (actionLineCount ? ' ورُصدت لغة إجراء في ' + actionLineCount + ' سطرًا.' : '')
      : ('تم فحص ' + lines.length.toLocaleString('ar-YE') + ' وحدة محتوى من ' + format + '. التحليل استخرج إشارات المخاطر، لغة الإجراء، التواريخ، والمقاطع الرقمية دون افتراض نموذج أعمال.'),
    signals,
    recommendations: tableProfile
      ? [...tableProfile.recommendations, ...((riskLines.length || actionLines.length) ? [recommendation] : [])]
      : [recommendation],
    findings: [
      tableProfile?.finding ?? genericFinding,
      ...(tableProfile && (riskLines.length || actionLines.length) ? [genericFinding] : []),
      ...base.findings,
    ],
    risks: tableProfile
      ? [...(tableProfile.statusCount > 0 ? [tableProfile.finding] : []), ...(riskLines.length ? [genericFinding] : []), ...base.risks]
      : (riskLines.length ? [genericFinding, ...base.risks] : base.risks),
    opportunities: tableProfile ? base.opportunities : (!riskLines.length && !actionLines.length ? [genericFinding, ...base.opportunities] : base.opportunities),
    guidance: {
      ...base.guidance,
      focus: tableProfile?.headline ?? (riskLines[0] ? 'بنود المخاطر/الاستثناءات' : actionLines[0] ? 'بنود الإجراء والاعتماد' : 'فهم محتوى الملف'),
      inspect: tableProfile ? [
        ...tableProfile.inspect,
        ...(riskLines.length ? ['مطابقات المخاطر النصية في المصدر:', ...riskLines] : []),
        ...(actionLines.length ? ['مطابقات لغة الإجراء في المصدر:', ...actionLines] : []),
        ...(numericLineCount > 0 ? numbers : []),
        ...(keywordEvidence ? ['الكلمات البارزة في المحتوى الجدولي: ' + keywordEvidence] : []),
      ] : [
        ...riskLines, ...actionLines, ...numbers,
        ...(riskLineCount > riskLines.length ? ['مطابقات المخاطر في المصدر: ' + riskLineCount + ' سطرًا؛ أمثلة معروضة: ' + riskLines.length + ' من أصل ' + riskLineCount + '.'] : []),
        ...(actionLineCount > actionLines.length ? ['مطابقات الإجراء في المصدر: ' + actionLineCount + ' سطرًا؛ أمثلة معروضة: ' + actionLines.length + ' من أصل ' + actionLineCount + '.'] : []),
        ...(numericLineCount > numbers.length ? ['أسطر تحتوي أرقامًا: ' + numericLineCount + '؛ أمثلة رقمية معروضة: ' + numbers.length + ' من أصل ' + numericLineCount + '.'] : []),
        ...(keywordEvidence ? ['الكلمات البارزة: ' + keywordEvidence] : []),
      ],
      boundary: 'التحليل العام يحفظ الدليل كما ورد في الملف. لا يحول النص الوصفي إلى حقيقة تجارية أو أثر مالي دون مصدر إضافي.',
    },
    advisorBrief: {
      health: tableProfile ? (tableProfile.statusCount > 0 ? 'REVIEW_REQUIRED' : 'ATTENTION') : (riskLines.length ? 'REVIEW_REQUIRED' : actionLines.length ? 'ATTENTION' : 'HEALTHY'),
      headline: tableProfile?.headline ?? (riskLines[0] ?? actionLines[0] ?? ('الملف قابل للفحص العام: ' + lines.length.toLocaleString('ar-YE') + ' وحدة محتوى.')),
      topFinding: tableProfile?.finding ?? genericFinding,
      topRisk: tableProfile ? (tableProfile.statusCount > 0 ? tableProfile.finding : riskLines.length ? genericFinding : null) : (riskLines.length ? genericFinding : null),
      topOpportunity: tableProfile ? null : (!riskLines.length && !actionLines.length ? genericFinding : null),
      recommendedAction: tableProfile?.recommendations[0]?.action ?? recommendation.action,
      ownerHint: tableProfile?.recommendations[0]?.ownerHint ?? recommendation.ownerHint,
      expectedOutcome: tableProfile?.recommendations[0]?.expectedOutcome ?? recommendation.expectedOutcome,
      measurement: tableProfile?.recommendations[0]?.measurement ?? recommendation.measurement,
      proofRequirement: 'كل ادعاء يجب أن يبقى مرتبطًا بالمصدر والبصمة والدليل المستخرج؛ لا اعتماد تلقائي للنتيجة النهائية.',
    },
  };
}