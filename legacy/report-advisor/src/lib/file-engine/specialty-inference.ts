import type { Dataset } from './types.js';

export type ReportSpecialty = 'inventory' | 'sales' | 'purchases' | 'receivables' | 'payments';

/**
 * Canonicalize a raw source heading for specialty matching.
 * Keep this intentionally domain-neutral: normalization never creates a business field.
 */
export function normalizeReportHeader(value: string): string {
  return String(value ?? '').toLowerCase().normalize('NFKC').replace(/[\s_./-]+/g, '');
}

/**
 * Infer a specialty only from column names/mappings observed in the parsed source.
 * Generic report intelligence is computed independently and must always remain present.
 */
export function inferReportSpecialty(dataset: Pick<Dataset, 'columns'>): ReportSpecialty | undefined {
  const fields = new Set(
    dataset.columns
      .flatMap((column) => [column.mappedField ?? '', normalizeReportHeader(column.name ?? '')])
      .map((field) => normalizeReportHeader(String(field)))
      .filter(Boolean),
  );
  const values = [...fields];
  const has = (...aliases: string[]) => aliases.some((alias) => {
    const normalizedAlias = normalizeReportHeader(alias);
    return fields.has(normalizedAlias) || values.some((field) => field.includes(normalizedAlias));
  });

  if (
    has('current_stock', 'currentstock', 'stockout_days', 'stockoutdays', 'daily_sales_rate', 'dailysalesrate', 'salesqty') ||
    (has('currentstock', 'الرصيدالحالي', 'المخزونالحالي') && has('productcode', 'salesqty', 'warehouse'))
  ) return 'inventory';
  if (has('supplier_name', 'suppliername', 'المورد') && has('total', 'net_amount', 'netamount')) return 'purchases';
  if (
    has('balance', 'الرصيدالمستحق', 'المتبقي') &&
    (has('paid_amount', 'paidamount', 'paid', 'المدفوع') || has('credit', 'دائن'))
  ) return 'receivables';
  if (has('paid_amount', 'paidamount', 'paid', 'المدفوع') && !has('total', 'net_amount', 'netamount')) return 'payments';
  if (has('customer_name', 'customername', 'customer', 'client', 'العميل') && has('total', 'net_amount', 'netamount', 'salesqty')) return 'sales';
  if (
    has('sales_qty', 'salesqty', 'كميةالمبيعات') &&
    (has('product_name', 'productname', 'product', 'item', 'productcode', 'sku') || has('warehouse', 'المستودع'))
  ) return 'inventory';
  return undefined;
}
