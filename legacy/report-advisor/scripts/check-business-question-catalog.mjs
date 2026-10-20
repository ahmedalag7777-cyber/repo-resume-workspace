import { buildBusinessQuestionSet, getBusinessQuestionDefinitions } from '../src/lib/report-intelligence/business-question-catalog.ts';
import { evaluateBusinessQuestion } from '../src/lib/report-intelligence/business-question-engine.ts';

const check = (condition, message) => { if (!condition) throw new Error(message); };

const sales = getBusinessQuestionDefinitions('sales');
check(sales.some((q) => q.id === 'sales.trend'), 'sales trend question missing');
check(sales.some((q) => q.id === 'sales.profitability'), 'sales profitability question missing');
check(sales.some((q) => q.id === 'report.proof'), 'universal proof question missing');

const answers = buildBusinessQuestionSet(
  'inventory',
  evaluateBusinessQuestion,
  {
    availableFields: ['productCode', 'currentStock'],
    sampleSize: 20,
    answers: { 'report.what-happened': { summary: 'المخزون الحالي قابل للعرض.' } },
  },
);
const trend = answers.find((q) => q.id === 'inventory.coverage');
check(trend?.state === 'NOT_AVAILABLE', 'inventory coverage must explain missing demand input');
check(trend?.missingFields.includes('salesQty'), 'coverage must name salesQty as missing');
check(answers.find((q) => q.id === 'report.what-happened')?.state === 'ANSWERED', 'universal WHAT should answer');

const small = buildBusinessQuestionSet(
  'sales',
  evaluateBusinessQuestion,
  { availableFields: ['documentDate', 'netAmount'], sampleSize: 3 },
);
check(small.find((q) => q.id === 'sales.trend')?.state === 'INSUFFICIENT_SAMPLE', 'sales trend must fail closed on small sample');

console.log('business-question-catalog: PASS');
