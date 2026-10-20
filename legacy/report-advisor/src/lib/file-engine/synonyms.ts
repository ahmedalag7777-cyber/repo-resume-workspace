import { normalizeColumnName } from './normalizer.ts';
import type { SynonymEntry } from './types';

let synonymCache: Map<string, { canonical: string; confidence: number }> | null = null;
let synonymLoadPromise: Promise<Map<string, { canonical: string; confidence: number }>> | null = null;
const REMOTE_SYNONYM_LOOKUP_TIMEOUT_MS = 1200;

function withTimeout<T>(value: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('REMOTE_SYNONYM_LOOKUP_TIMEOUT')), timeoutMs);
    Promise.resolve(value).then(
      result => { clearTimeout(timer); resolve(result); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

const BUILTIN_SYNONYMS: Array<[string, string, number]> = [
  ['sku', 'sku', 96], ['item code', 'sku', 96], ['product code', 'sku', 96], ['item id', 'sku', 92], ['رقم الصنف', 'sku', 98], ['كود الصنف', 'sku', 98], ['رمز الصنف', 'sku', 96],
  ['الباركود', 'barcode', 96], ['barcode', 'barcode', 96], ['باركود', 'barcode', 96], ['name', 'name', 96], ['item name', 'name', 98], ['product name', 'name', 98], ['اسم الصنف', 'name', 98], ['اسم المنتج', 'name', 98],
  ['description', 'description', 94], ['الوصف', 'description', 96], ['price', 'price', 96], ['sale price', 'selling_price', 98], ['selling price', 'selling_price', 98], ['selling_price', 'selling_price', 98], ['السعر', 'price', 98], ['سعر البيع', 'selling_price', 98],
  ['المخزن', 'warehouse', 98], ['المستودع', 'warehouse', 98], ['warehouse', 'warehouse', 98],
  ['الرصيد', 'current_stock', 98], ['الرصيد الحالي', 'current_stock', 98], ['الرصيد الإفتتاحي', 'opening_stock', 98], ['المخزون الافتتاحي', 'opening_stock', 98], ['current stock', 'current_stock', 98], ['on hand', 'current_stock', 98],
  ['الوارد', 'incoming', 98], ['الـوارد', 'incoming', 98], ['incoming', 'incoming', 98], ['inbound', 'incoming', 98], ['صافي الوارد', 'net_inbound', 98], ['net inbound', 'net_inbound', 98],
  ['صافي المبيعات', 'sales_qty', 98], ['صافي مبيعات مرحل', 'sales_qty', 92], ['صافي مبيعات لم يرحل', 'sales_qty', 92], ['كمية المبيعات', 'sales_qty', 98], ['sales qty', 'sales_qty', 98],
  ['معدل البيع ليومي', 'daily_sales_rate', 98], ['معدل البيع اليومي', 'daily_sales_rate', 98], ['daily sales rate', 'daily_sales_rate', 98],
  ['معدل البيع العام', 'annual_sales_rate', 98], ['معدل البيع السنوي', 'annual_sales_rate', 98], ['annual sales rate', 'annual_sales_rate', 98],
  ['الفترة المتوقعة لنفاد الكمية', 'stockout_days', 98], ['الفترةالمتوقعة لنفادالكمية', 'stockout_days', 98], ['أيام النفاد', 'stockout_days', 98], ['stockout days', 'stockout_days', 98],
  ['عمر المخزون', 'stock_age_days', 98], ['عمر المخزون للفترة', 'stock_age_period_days', 98], ['تحويل غير مستلم', 'transfers_pending', 98],
  ['cost', 'cost', 94], ['cost price', 'cost_price', 98], ['cost_price', 'cost_price', 98], ['التكلفة', 'cost', 96], ['quantity', 'quantity', 96], ['qty', 'quantity', 96], ['stock', 'quantity', 94], ['available quantity', 'quantity', 96], ['الكمية', 'quantity', 98], ['المخزون', 'quantity', 96],
  ['unit', 'unit', 96], ['الوحدة', 'unit', 98], ['category', 'category', 94], ['الفئة', 'category', 96], ['التصنيف', 'category', 96], ['status', 'status', 94], ['الحالة', 'status', 96],
  ['min stock', 'min_stock', 98], ['minimum stock', 'min_stock', 96], ['min_stock', 'min_stock', 98], ['reorder point', 'reorder_point', 98], ['reorder_point', 'reorder_point', 98], ['is active', 'is_active', 98], ['is_active', 'is_active', 98], ['active', 'is_active', 92], ['نشط', 'is_active', 98],
  ['customer number', 'code', 98], ['customer code', 'code', 98], ['code', 'code', 98], ['رقم العميل', 'code', 98], ['كود العميل', 'code', 98], ['customer id', 'customer_id', 96], ['customer name', 'customer_name', 98], ['اسم العميل', 'customer_name', 98], ['phone', 'phone', 96], ['mobile', 'phone', 96], ['هاتف', 'phone', 96], ['جوال', 'phone', 96],
  ['email', 'email', 96], ['البريد الإلكتروني', 'email', 98], ['segment', 'segment', 98], ['customer segment', 'segment', 98], ['شريحة العميل', 'segment', 98], ['credit limit', 'credit_limit', 98], ['credit_limit', 'credit_limit', 98], ['حد ائتماني', 'credit_limit', 98], ['payment terms days', 'payment_terms_days', 98], ['payment_terms_days', 'payment_terms_days', 98], ['payment terms', 'payment_terms_days', 90], ['أيام شروط الدفع', 'payment_terms_days', 98],
  ['date', 'date', 94], ['التاريخ', 'date', 96], ['invoice number', 'invoice_number', 98], ['invoice_number', 'invoice_number', 98], ['رقم الفاتوره', 'invoice_number', 99], ['رقم الفاتورة', 'invoice_number', 99], ['invoice date', 'invoice_date', 98], ['invoice_date', 'invoice_date', 98], ['invoice type', 'invoice_type', 98], ['invoice_type', 'invoice_type', 98], ['نوع الفاتوره', 'invoice_type', 99], ['نوع الفاتورة', 'invoice_type', 99], ['subtotal', 'subtotal', 98], ['tax amount', 'tax_amount', 98], ['tax_amount', 'tax_amount', 98], ['paid amount', 'paid_amount', 98], ['paid_amount', 'paid_amount', 98], ['total', 'total', 94], ['الإجمالي', 'total', 96], ['اجمالي الفاتوره', 'total', 99], ['إجمالي الفاتورة', 'total', 99], ['مبلغ الصافي بالمحلي', 'net_amount', 99], ['مبلغ صافي المحلي', 'net_amount', 98], ['الصافي بالمحلي', 'net_amount', 98],
  // Period columns and client-portfolio fields used in ordinary Excel reports.
  // These are analytical semantic mappings; no business records are written automatically.
  ['يناير', 'monthly_sales_jan', 98], ['january', 'monthly_sales_jan', 98], ['jan', 'monthly_sales_jan', 94],
  ['فبراير', 'monthly_sales_feb', 98], ['february', 'monthly_sales_feb', 98], ['feb', 'monthly_sales_feb', 94],
  ['مارس', 'monthly_sales_mar', 98], ['march', 'monthly_sales_mar', 98], ['mar', 'monthly_sales_mar', 94],
  ['أبريل', 'monthly_sales_apr', 98], ['ابريل', 'monthly_sales_apr', 98], ['april', 'monthly_sales_apr', 98], ['apr', 'monthly_sales_apr', 94],
  ['مايو', 'monthly_sales_may', 98], ['may', 'monthly_sales_may', 96],
  ['يونيو', 'monthly_sales_jun', 98], ['june', 'monthly_sales_jun', 98], ['jun', 'monthly_sales_jun', 94],
  ['يوليو', 'monthly_sales_jul', 98], ['july', 'monthly_sales_jul', 98], ['jul', 'monthly_sales_jul', 94],
  ['أغسطس', 'monthly_sales_aug', 98], ['اغسطس', 'monthly_sales_aug', 98], ['august', 'monthly_sales_aug', 98], ['aug', 'monthly_sales_aug', 94],
  ['الإجمالي الكلي', 'total', 99], ['اجمالي كلي', 'total', 98], ['grand total', 'total', 98], ['total amount', 'total', 96],
  ['حالة الزبون', 'customer_status', 99], ['حالة العميل', 'customer_status', 99], ['customer status', 'customer_status', 98], ['customer_status', 'customer_status', 98],
  ['تصنيف الأهمية (ABC)', 'abc_classification', 99], ['تصنيف الاهمية ABC', 'abc_classification', 99], ['تصنيف الأهمية', 'abc_classification', 96], ['abc class', 'abc_classification', 98], ['abc classification', 'abc_classification', 98],
  ['مؤشر المخاطر والفرص', 'risk_indicator', 99], ['مؤشر المخاطر', 'risk_indicator', 98], ['risk indicator', 'risk_indicator', 98], ['risk opportunity indicator', 'risk_indicator', 98],
  ['عدد أشهر التعامل', 'active_months_count', 99], ['عدد اشهر التعامل', 'active_months_count', 99], ['active months', 'active_months_count', 96], ['months transacted', 'active_months_count', 96],
  ['متوسط الشهر الفعلي', 'average_monthly_value', 99], ['متوسط الشراء الشهري', 'average_monthly_value', 96], ['average monthly value', 'average_monthly_value', 98],
  ['الشهر الأعلى شراءً', 'peak_purchase_month', 99], ['الشهر الاعلى شراء', 'peak_purchase_month', 99], ['peak purchase month', 'peak_purchase_month', 98],
  ['نسبة النمو (يوليو-أغسطس)', 'growth_rate', 99], ['نسبة النمو يوليو اغسطس', 'growth_rate', 99], ['growth rate', 'growth_rate', 98], ['monthly growth rate', 'growth_rate', 98],
];

function createBuiltinMap(): Map<string, { canonical: string; confidence: number }> { const map = new Map<string, { canonical: string; confidence: number }>(); for (const [synonym, canonical, confidence] of BUILTIN_SYNONYMS) map.set(normalizeColumnName(synonym), { canonical, confidence }); return map; }
async function getBrowserSupabase() { if (typeof window === 'undefined') throw new Error('BROWSER_SUPABASE_UNAVAILABLE_IN_SERVER_FILE_ENGINE'); const { supabase } = await import('../supabase'); return supabase; }

export async function loadSynonyms(): Promise<Map<string, { canonical: string; confidence: number }>> {
  if (synonymCache) return synonymCache;
  if (synonymLoadPromise) return synonymLoadPromise;

  synonymLoadPromise = (async () => {
    const map = createBuiltinMap();
    if (typeof window !== 'undefined') {
      try {
        const { data, error } = await withTimeout(
          (async () => {
            const { supabase } = await import('../supabase');
            return supabase.from('synonym_dictionary').select('*').eq('is_active', true);
          })(),
          REMOTE_SYNONYM_LOOKUP_TIMEOUT_MS,
        );
        if (!error && data) {
          for (const entry of data as SynonymEntry[]) {
            const key = normalizeColumnName(entry.synonym);
            const existing = map.get(key);
            if (!existing || entry.confidence > existing.confidence) {
              map.set(key, { canonical: entry.canonical_field, confidence: entry.confidence });
            }
          }
        }
      } catch {
        // File analysis must remain usable when the optional remote dictionary is
        // unavailable. The deterministic built-in Arabic/English map is sufficient
        // to continue parsing and visibly report the source rather than hang.
      }
    }
    synonymCache = map;
    return map;
  })();

  try {
    return await synonymLoadPromise;
  } finally {
    synonymLoadPromise = null;
  }
}
export function clearSynonymCache(): void { synonymCache = null; }
export interface ColumnMapping { sourceColumn: string; mappedField: string | null; confidence: number; requiresReview: boolean; }
export async function mapColumns(sourceColumns: string[]): Promise<ColumnMapping[]> { const synonyms = await loadSynonyms(); return sourceColumns.map(col => { const normalized = normalizeColumnName(col); const match = synonyms.get(normalized); if (match) return { sourceColumn: col, mappedField: match.canonical, confidence: match.confidence, requiresReview: match.confidence < 80 }; const partialMatch = findPartialMatch(normalized, synonyms); return partialMatch ? { sourceColumn: col, mappedField: partialMatch.canonical, confidence: partialMatch.confidence, requiresReview: true } : { sourceColumn: col, mappedField: null, confidence: 0, requiresReview: true }; }); }
function findPartialMatch(normalized: string, synonyms: Map<string, { canonical: string; confidence: number }>): { canonical: string; confidence: number } | null { let bestMatch: { canonical: string; confidence: number } | null = null; let bestScore = 0; for (const [key, value] of synonyms) { if (normalized.includes(key) || key.includes(normalized)) { const score = Math.min(normalized.length, key.length) / Math.max(normalized.length, key.length) * value.confidence * 0.7; if (score > bestScore && score > 50) { bestScore = score; bestMatch = { canonical: value.canonical, confidence: Math.round(score) }; } } } return bestMatch; }
export async function addSynonym(canonicalField: string, synonym: string, language = 'ar', confidence = 90): Promise<void> { const supabase = await getBrowserSupabase(); const { error } = await supabase.from('synonym_dictionary').insert({ canonical_field: canonicalField, synonym, language, confidence, is_active: true }); if (error) throw error; clearSynonymCache(); }
export async function fetchAllSynonyms(): Promise<SynonymEntry[]> { const supabase = await getBrowserSupabase(); const { data, error } = await supabase.from('synonym_dictionary').select('*').order('canonical_field', { ascending: true }); if (error) throw error; return data as SynonymEntry[]; }
export async function updateSynonym(id: string, updates: Partial<SynonymEntry>): Promise<void> { const supabase = await getBrowserSupabase(); const { error } = await supabase.from('synonym_dictionary').update(updates).eq('id', id); if (error) throw error; clearSynonymCache(); }
export async function deleteSynonym(id: string): Promise<void> { const supabase = await getBrowserSupabase(); const { error } = await supabase.from('synonym_dictionary').delete().eq('id', id); if (error) throw error; clearSynonymCache(); }
