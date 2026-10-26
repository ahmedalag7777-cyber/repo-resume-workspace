import Decimal from "decimal.js";
import { toNumber } from "./parse";
import type { ColumnProfile, RawTable } from "./types";

export interface NumericVerification {
  column: string;
  sourceTotal: number;
  profileTotal: number;
  matches: boolean;
  numericRows: number;
  invalidRows: number[];
}

/** Independent recomputation from source cells, not from reported totals. */
export function verifyNumericTotals(table: RawTable, columns: ColumnProfile[]): NumericVerification[] {
  const Exact = Decimal.clone({ precision: 40 });
  return columns.filter((c) => c.kind === "numeric").map((column) => {
    let total = new Exact(0), numericRows = 0;
    const invalidRows: number[] = [];
    table.rows.forEach((row, i) => {
      const cell = row[column.index] ?? null;
      const value = toNumber(cell);
      if (value !== null) { total = total.plus(value); numericRows++; }
      else if (cell !== null) invalidRows.push(table.sourceRows[i] ?? i + table.headerRow + 1);
    });
    const sourceTotal = total.toNumber();
    const profileTotal = column.sum ?? 0;
    return { column: column.name, sourceTotal, profileTotal,
      matches: Number.isFinite(sourceTotal) && Number.isFinite(profileTotal) && sourceTotal === profileTotal,
      numericRows, invalidRows };
  });
}