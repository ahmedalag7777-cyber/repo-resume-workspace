import assert from 'node:assert/strict';

import { extractArabicSalesTable, type PdfPageText, type PdfTextToken } from '../src/lib/file-engine/pdf-table.ts';

function token(text: string, x: number, y: number, width = Math.max(8, text.length * 5)): PdfTextToken {
  return { text, x, y, width, height: 10 };
}

const header: PdfTextToken[] = [
  token('مبلغ', 58, 121), token('الصافي', 85, 121), token('بالمحلي', 112, 121),
  token('الفاتورة', 158, 121), token('اجمالي', 185, 121), token('الضريبة', 243, 121),
  token('الخصم', 366, 121), token('مبلغ', 429, 121), token('الفاتورة', 455, 121),
  token('اسم', 542, 121), token('العميل', 564, 121), token('العملة', 633, 121),
  token('الفاتورة', 662, 121), token('نوع', 690, 121), token('التاريخ', 723, 121),
  token('رقم', 772, 121), token('الفاتورة', 798, 121),
];

function salesRow(y: number, invoiceNumber: string, date: string, customer: string, total: string): PdfTextToken[] {
  const customerTokens = customer.split(' ').reverse().map((word, index) =>
    token(word, 500 + index * 22, y),
  );
  return [
    token(total, 90, y),
    token(total, 180, y),
    token('0.00', 248, y),
    token('0.00', 307, y),
    token('0.00', 370, y),
    token(total, 450, y),
    ...customerTokens,
    token('YER', 635, y),
    token('آجل', 680, y),
    token(date, 716, y, 38),
    token(invoiceNumber, 784, y, 20),
  ];
}

const page: PdfPageText = {
  pageNumber: 1,
  pageWidth: 841.92,
  pageHeight: 595.32,
  items: [
    ...header,
    ...salesRow(136, '785', '02/06/2026', 'محلات عادل حسين حسن نزار واخوانه', '855,000.00'),
    ...salesRow(150, '827', '02/06/2026', 'علي عبدالله إسماعيل مرغم للتجارة', '5,404,000.00'),
    token('تاريخ التقرير', 780, 567),
  ],
};

const result = extractArabicSalesTable([page]);
assert.ok(result, 'ARABIC_SALES_LAYOUT_NOT_DETECTED');
assert.equal(result?.headers.length, 11);
assert.equal(result?.rows.length, 2);
assert.equal(result?.rows[0]?.invoice_number, 785);
assert.equal(result?.rows[0]?.invoice_date, '2026-06-02');
assert.equal(result?.rows[0]?.invoice_type, 'آجل');
assert.equal(result?.rows[0]?.currency, 'YER');
assert.equal(result?.rows[0]?.customer_name, 'محلات عادل حسين حسن نزار واخوانه');
assert.equal(result?.rows[0]?.total, '855,000.00');
assert.equal(result?.rows[1]?.invoice_number, 827);
assert.equal(result?.rows[1]?.total, '5,404,000.00');

console.log('PDF_ARABIC_SALES_LAYOUT_PASS');
