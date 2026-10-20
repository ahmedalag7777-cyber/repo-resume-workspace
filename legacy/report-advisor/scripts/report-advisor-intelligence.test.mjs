import { deriveReportIntelligence } from '../src/lib/report-intelligence/report-smart-insights.ts';

const check = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sales = deriveReportIntelligence({
  specialty: 'sales',
  rowCount: 4,
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'صافي المبلغ', mappedField: 'netAmount' },
        { name: 'العميل', mappedField: 'customer' },
        { name: 'التاريخ', mappedField: 'invoiceDate' },
      ],
    }],
  },
  canonicalRows: [
    { row_number: 1, data: { netAmount: 1000, customer: 'عميل أ', invoiceDate: '2026-08-10' } },
    { row_number: 2, data: { netAmount: 900, customer: 'عميل أ', invoiceDate: '2026-08-20' } },
    { row_number: 3, data: { netAmount: 100, customer: 'عميل ب', invoiceDate: '2026-09-10' } },
    { row_number: 4, data: { netAmount: 100, customer: 'عميل ب', invoiceDate: '2026-09-20' } },
  ],
});

check(sales.findings.some((item) => item.id === 'sales:total-value'), 'sales total finding missing');
check(sales.findings.some((item) => item.id === 'sales:top-party'), 'sales top-party finding missing');
check(sales.findings.some((item) => item.id === 'sales:change-contributor'), 'sales change contributor finding missing');
check(sales.risks.some((item) => item.id === 'sales:period-decline-risk'), 'sales decline risk missing');
check(sales.advisorBrief.topFinding?.id === 'sales:total-value', 'advisor brief must expose the top finding');
check(sales.advisorBrief.recommendedAction, 'advisor brief needs a concrete action');
check(sales.advisorBrief.ownerHint === 'مسؤول المبيعات', 'sales owner hint missing');
check(sales.findings.find((item) => item.id === 'sales:top-party')?.evidence.some((e) => e.includes('customerField=')), 'finding must expose evidence field');
check(sales.findings.find((item) => item.id === 'sales:top-party')?.limitation, 'finding must expose limitation');
check(sales.recommendations.some((item) => item.id === 'rec:sales:top-party'), 'sales top-party must become a decision recommendation');
check(sales.recommendations.find((item) => item.id === 'rec:sales:top-party')?.title.includes('التركيّز'), 'sales recommendation must be decision-oriented');


const salesNeedsAttention = deriveReportIntelligence({
  specialty: 'sales',
  rowCount: 10,
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'القيمة', mappedField: 'netAmount', nullCount: 0 },
        { name: 'الملاحظات', mappedField: null, nullCount: 0 },
      ],
    }],
  },
  canonicalRows: Array.from({ length: 10 }, (_, index) => ({
    row_number: index + 1,
    data: { netAmount: index + 1, 'الملاحظات': index % 2 ? 'x' : '' },
  })),
});
check(salesNeedsAttention.advisorBrief.health === 'REVIEW_REQUIRED', 'material source signal must not be presented as healthy');
check(salesNeedsAttention.signals.some((item) => item.id === 'sales:date-missing'), 'sales date-missing signal must exist');
const fullRecommendationColumns = Array.from({ length: 12 }, (_, index) => ({
  name: 'حقل غير مربوط ' + (index + 1),
  mappedField: null,
}));
const fullSurface = deriveReportIntelligence({
  specialty: 'sales',
  rowCount: 1,
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'القيمة', mappedField: 'netAmount' },
        { name: 'العميل', mappedField: 'customer' },
        ...fullRecommendationColumns,
      ],
    }],
  },
  canonicalRows: [{ row_number: 1, data: { netAmount: 100, customer: 'عميل' } }],
});
check(fullSurface.recommendations.length >= 12, 'intelligence recommendations must not be truncated at eight');
check(fullSurface.recommendations.some((item) => item.id === 'rec:unmapped:حقل غير مربوط 12'), 'late unmapped recommendation must remain visible');


const inventory = deriveReportIntelligence({
  specialty: 'inventory',
  rowCount: 3,
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'رقم الصنف', mappedField: 'sku' },
        { name: 'الرصيد', mappedField: 'currentStock' },
        { name: 'السعر', mappedField: 'price' },
      ],
    }],
  },
  canonicalRows: [
    { row_number: 1, data: { sku: 'A', currentStock: -3, price: 100 } },
    { row_number: 2, data: { sku: 'B', currentStock: 10, price: 200 } },
    { row_number: 3, data: { sku: 'C', currentStock: 2, price: 50 } },
  ],
});

check(inventory.findings.some((item) => item.id === 'inventory:position'), 'inventory position finding missing');
check(inventory.risks.some((item) => item.id === 'inventory:negative-balance-risk'), 'negative inventory risk missing');
check(inventory.opportunities.some((item) => item.id === 'inventory:value-focus-opportunity'), 'inventory value focus opportunity missing');
check(inventory.advisorBrief.topRisk?.id === 'inventory:negative-balance-risk', 'inventory advisor brief must surface risk');
check(inventory.advisorBrief.ownerHint === 'مسؤول المخزون', 'inventory owner hint missing');
check(inventory.recommendations.some((item) => item.id === 'rec:inventory:position'), 'inventory finding must be available as a decision recommendation');


const demandPressure = deriveReportIntelligence({
  specialty: 'inventory',
  rowCount: 12,
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'التاريخ', mappedField: 'date' },
        { name: 'SKU', mappedField: 'sku' },
        { name: 'الرصيد الحالي', mappedField: 'current_stock' },
        { name: 'المبيعات', mappedField: 'sales_qty' },
      ],
    }],
  },
  canonicalRows: Array.from({ length: 12 }, (_, index) => ({
    row_number: index + 1,
    data: {
      date: `2026-${String(index + 1).padStart(2, '0')}-15`,
      sku: 'SKU-' + String((index % 5) + 1),
      current_stock: 22 + index,
      sales_qty: 8 + index,
    },
  })),
});

check(demandPressure.signals.some((item) => item.id === 'inventory:demand-pressure-low-coverage'), 'inventory demand-pressure + low-coverage signal missing');
check(demandPressure.recommendations.some((item) => item.id === 'rec:inventory:demand-pressure-low-coverage'), 'demand-pressure recommendation missing');
check(demandPressure.advisorBrief.headline.includes('ارتفع متوسط الطلب'), 'advisor headline must explain why now for rising demand');
check(demandPressure.recommendations.find((item) => item.id === 'rec:inventory:demand-pressure-low-coverage')?.action.includes('مهلة التوريد'), 'recommendation must stop short of inventing a purchase quantity');
check(demandPressure.recommendations.find((item) => item.id === 'rec:inventory:demand-pressure-low-coverage')?.title.includes('إعادة الطلب'), 'recommendation title must be decision-oriented');
check(demandPressure.recommendations.find((item) => item.id === 'rec:inventory:demand-pressure-low-coverage')?.risk.includes('شراء زائد'), 'recommendation risk must explain both stockout and overbuying risk');
check(demandPressure.signals.find((item) => item.id === 'inventory:demand-pressure-low-coverage')?.evidence.some((e) => e.includes('demandAcceleration=')), 'demand acceleration evidence missing');

const empty = deriveReportIntelligence({
  specialty: 'sales',
  rowCount: 0,
  sourceAnalysis: { datasets: [{ columns: [] }] },
  canonicalRows: [],
});

check(empty.findings.length === 0, 'empty source must not fabricate findings');
check(empty.risks.length === 0, 'empty source must not fabricate risks');
check(empty.opportunities.length === 0, 'empty source must not fabricate opportunities');
check(empty.advisorBrief.health !== 'REVIEW_REQUIRED', 'empty source health must not claim an unproven business risk');

const receivables = deriveReportIntelligence({
  specialty: 'receivables',
  rowCount: 4,
  sourceAnalysis: { datasets: [{ columns: [
    { name: 'العميل', mappedField: 'customer' },
    { name: 'الرصيد المستحق', mappedField: 'balance' },
  ] }] },
  canonicalRows: [
    { row_number: 1, data: { customer: 'عميل أ', balance: 800 } },
    { row_number: 2, data: { customer: 'عميل أ', balance: 200 } },
    { row_number: 3, data: { customer: 'عميل ب', balance: 100 } },
    { row_number: 4, data: { customer: 'عميل ج', balance: 50 } },
  ],
});
check(receivables.recommendations.some((item) => item.id === 'rec:receivables:concentration-risk'), 'receivables concentration must become a decision recommendation');

const profitability = deriveReportIntelligence({
  specialty: 'profitability',
  rowCount: 3,
  sourceAnalysis: { datasets: [{ columns: [
    { name: 'الإيراد', mappedField: 'revenue' },
    { name: 'التكلفة', mappedField: 'cost' },
  ] }] },
  canonicalRows: [
    { row_number: 1, data: { revenue: 1000, cost: 950 } },
    { row_number: 2, data: { revenue: 800, cost: 760 } },
    { row_number: 3, data: { revenue: 600, cost: 570 } },
  ],
});
check(profitability.recommendations.some((item) => item.id === 'rec:profitability:low-margin-risk'), 'profitability low-margin risk must become a decision recommendation');

console.log('business-finding-decision-recommendations: PASS');

console.log('report-advisor-intelligence: PASS');
