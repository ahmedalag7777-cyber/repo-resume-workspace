import Decimal from "decimal.js";
import type { AnalysisResult } from "./types";

export interface ColumnDelta {
  column: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  pct: number | null;
}
export interface ReportComparison {
  comparable: boolean;
  sharedColumns: number;
  rows: { before: number; after: number; delta: number };
  quality: { before: number; after: number; delta: number };
  columns: ColumnDelta[];
  added: string[];
  removed: string[];
}

const Exact = Decimal.clone({ precision: 40 });
const key = (name: string) => name.trim().toLowerCase();

/**
 * Compares two saved results using only independently verified totals.
 * A column counts only when its total was verified in that report; unverified totals are never compared.
 */
export function compareReports(before: AnalysisResult, after: AnalysisResult): ReportComparison {
  const verified = (r: AnalysisResult) =>
    new Map((r.verification ?? []).filter((v) => v.matches).map((v) => [key(v.column), v]));
  const a = verified(before), b = verified(after);
  const columns: ColumnDelta[] = [];
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (!vb) continue;
    const delta = new Exact(vb.sourceTotal).minus(va.sourceTotal);
    columns.push({
      column: vb.column,
      before: va.sourceTotal,
      after: vb.sourceTotal,
      delta: delta.toNumber(),
      pct: va.sourceTotal === 0 ? null : delta.div(Math.abs(va.sourceTotal)).times(100).toDecimalPlaces(1).toNumber(),
    });
  }
  columns.sort((x, y) => Math.abs(y.pct ?? 0) - Math.abs(x.pct ?? 0));
  const names = (r: AnalysisResult) => new Map(r.columns.map((c) => [key(c.name), c.name]));
  const na = names(before), nb = names(after);
  return {
    comparable: columns.length > 0,
    sharedColumns: [...na.keys()].filter((k) => nb.has(k)).length,
    rows: { before: before.rowCount, after: after.rowCount, delta: after.rowCount - before.rowCount },
    quality: { before: before.qualityScore, after: after.qualityScore, delta: after.qualityScore - before.qualityScore },
    columns,
    added: [...nb].filter(([k]) => !na.has(k)).map(([, v]) => v),
    removed: [...na].filter(([k]) => !nb.has(k)).map(([, v]) => v),
  };
}
