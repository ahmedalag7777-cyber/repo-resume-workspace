import { describe, expect, it } from 'vitest';
import { reconcileForCanonical } from './canonical-truth-boundary';

describe('canonical import identity normalization', () => {
  const provenance = {
    tenantId: 'tenant-1',
    sourceId: 'source-1',
    sourceHash: 'hash-1',
    sourceDocumentId: 'document-1',
  };

  it('rejects product duplicates that normalize to the same database business key', () => {
    const result = reconcileForCanonical(
      'products',
      provenance.tenantId,
      provenance.sourceId,
      provenance.sourceHash,
      provenance.sourceDocumentId,
      (_data, rowNumber) => `evidence-${rowNumber}`,
      [
        { rowNumber: 1, data: { sku: 'ABC 123', name: 'A' } },
        { rowNumber: 2, data: { sku: ' abc123 ', name: 'B' } },
      ],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rejected).toEqual([
      { rowNumber: 2, reason: 'CONFLICTING_EVIDENCE_FOR_SAME_CANONICAL_IDENTITY' },
    ]);
  });

  it('rejects invoice-number duplicates with the same normalization semantics', () => {
    const result = reconcileForCanonical(
      'sales_invoices',
      provenance.tenantId,
      provenance.sourceId,
      provenance.sourceHash,
      provenance.sourceDocumentId,
      (_data, rowNumber) => `evidence-${rowNumber}`,
      [
        { rowNumber: 1, data: { invoice_number: 'INV 001' } },
        { rowNumber: 2, data: { invoice_number: ' inv001 ' } },
      ],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rejected).toEqual([
      { rowNumber: 2, reason: 'CONFLICTING_EVIDENCE_FOR_SAME_CANONICAL_IDENTITY' },
    ]);
  });

  it('accepts a domain-neutral generic dataset with deterministic row identity', () => {
    const result = reconcileForCanonical(
      'generic:customer-balances',
      provenance.tenantId,
      provenance.sourceId,
      provenance.sourceHash,
      provenance.sourceDocumentId,
      (_data, rowNumber) => `evidence-${rowNumber}`,
      [
        { rowNumber: 1, data: { label: 'A', amount: 10 } },
        { rowNumber: 2, data: { label: 'B', amount: 20 } },
      ],
    );

    expect(result.rejected).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].provenance.lineageId).toBe('tenant-1:document-1:1');
    expect(result.rows[1].provenance.lineageId).toBe('tenant-1:document-1:2');
  });

  it('rejects mixed duplicate generic rows only when the row identity is repeated', () => {
    const result = reconcileForCanonical(
      'generic:stock-movement',
      provenance.tenantId,
      provenance.sourceId,
      provenance.sourceHash,
      provenance.sourceDocumentId,
      (_data, rowNumber) => `evidence-${rowNumber}`,
      [
        { rowNumber: 1, data: { movement: 'A' } },
        { rowNumber: 1, data: { movement: 'B' } },
      ],
    );

    expect(result.rejected).toEqual([
      { rowNumber: 1, reason: 'CONFLICTING_EVIDENCE_FOR_SAME_CANONICAL_IDENTITY' },
    ]);
  });

});
