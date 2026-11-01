import Decimal from "decimal.js";
import { toNumber } from "./parse";
import type { ColumnProfile, RawTable } from "./types";

export const RELATIONSHIP_LIMITS = { columns: 8, rows: 1000, results: 20, minimumRows: 12, absoluteTolerance: 0.01, relativeTolerance: 1e-9 };
export interface RelationshipCandidate {
  columns: [string, string, string];
  indexes: [number, number, number];
  operation: "+" | "−" | "×";
  status: "supported" | "counterexamples";
  discovery: { rows: number[]; matches: number };
  validation: { rows: number[]; matches: number };
  excludedRows: number[];
  maxResidual: number;
  counterexamples: { row: number; actual: number; expected: number; residual: number }[];
}
export interface RelationshipInference {
  status: "evaluated" | "insufficient" | "unavailable";
  limits: typeof RELATIONSHIP_LIMITS;
  sampledRows: number;
  numericColumns: number;
  testedEquations: number;
  omittedCandidates: number;
  truncated: boolean;
  candidates: RelationshipCandidate[];
}

/** Observed arithmetic only: never relabel columns, fill cells, infer causality, or recalculate workbook formulas. */
export function inferRelationships(table: RawTable, profiles: ColumnProfile[]): RelationshipInference {
  const numeric = profiles.filter((p) => p.kind === "numeric" && table.headers.filter((h) => h === p.name).length === 1);
  const cols = numeric.slice(0, RELATIONSHIP_LIMITS.columns);
  const count = Math.min(table.rows.length, RELATIONSHIP_LIMITS.rows);
  const sampled = Array.from({ length: count }, (_, i) => Math.floor(i * table.rows.length / count));
  const result: RelationshipInference = {
    status: cols.length < 3 ? "unavailable" : count < RELATIONSHIP_LIMITS.minimumRows ? "insufficient" : "evaluated",
    limits: { ...RELATIONSHIP_LIMITS }, sampledRows: count, numericColumns: numeric.length, testedEquations: 0,
    omittedCandidates: 0, truncated: numeric.length > cols.length || count < table.rows.length, candidates: [],
  };
  if (result.status !== "evaluated") return result;
  const D = Decimal.clone({ precision: 40 });
  for (const output of cols) for (const left of cols) for (const right of cols) {
    if (new Set([output.index, left.index, right.index]).size !== 3) continue;
    for (const operation of ["+", "−", "×"] as const) {
      if (operation !== "−" && left.index > right.index) continue;
      result.testedEquations++;
      const excludedRows: number[] = [];
      const rows = sampled.flatMap((i) => {
        const row = table.rows[i];
        const source = table.sourceRows[i] ?? i + table.headerRow + 1;
        const a = toNumber(row?.[left.index] ?? null), b = toNumber(row?.[right.index] ?? null), actual = toNumber(row?.[output.index] ?? null);
        if (a === null || b === null || actual === null || ![a, b, actual].every(Number.isFinite)) { excludedRows.push(source); return []; }
        const expected = operation === "+" ? new D(a).plus(b) : operation === "−" ? new D(a).minus(b) : new D(a).times(b);
        const residual = new D(actual).minus(expected).abs();
        const tolerance = new D(RELATIONSHIP_LIMITS.absoluteTolerance).plus(new D(actual).abs().times(RELATIONSHIP_LIMITS.relativeTolerance));
        return [{ row: source, a, b, actual, expected: expected.toNumber(), residual: residual.toNumber(), matches: residual.lte(tolerance) }];
      });
      if (rows.length < RELATIONSHIP_LIMITS.minimumRows) continue;
      const discovery = rows.filter((_, i) => i % 3 !== 2), validation = rows.filter((_, i) => i % 3 === 2);
      if (["a", "b", "actual"].some((key) => new Set(discovery.map((r) => r[key as "a" | "b" | "actual"])).size < 3)) continue;
      const matches = discovery.filter((r) => r.matches).length;
      if (matches / discovery.length < 0.9) continue;
      const validationMatches = validation.filter((r) => r.matches).length;
      const candidate: RelationshipCandidate = {
        columns: [output.name, left.name, right.name], indexes: [output.index, left.index, right.index], operation,
        status: validationMatches === validation.length && matches === discovery.length ? "supported" : "counterexamples",
        discovery: { rows: discovery.map((r) => r.row), matches }, validation: { rows: validation.map((r) => r.row), matches: validationMatches },
        excludedRows, maxResidual: Math.max(...rows.map((r) => r.residual)),
        counterexamples: rows.filter((r) => !r.matches).slice(0, 8).map(({ row, actual, expected, residual }) => ({ row, actual, expected, residual })),
      };
      if (result.candidates.length < RELATIONSHIP_LIMITS.results) result.candidates.push(candidate);
      else { result.omittedCandidates++; result.truncated = true; }
    }
  }
  return result;
}