import { describe, expect, it } from "vitest";
import { parseCsvText, gridToTable } from "@/lib/universal/parse";
import { profileColumns } from "@/lib/universal/profile";
import { resolveSemantics } from "@/lib/universal/semantic-inference";
import { inferRelationships } from "@/lib/universal/relationship-inference";
import { analyzeTable } from "@/lib/universal/pipeline";

const table = (operation: "+" | "−" | "×" = "+") => gridToTable([
  ["A", "B", "C"], ...Array.from({ length: 18 }, (_, i) => { const a = i - 2, b = (i % 5) + 2; return [a, b, operation === "+" ? a + b : operation === "−" ? a - b : a * b]; }),
], null);
const relationships = (t: ReturnType<typeof table>) => inferRelationships(t, profileColumns(t));

describe("reviewable semantic inference", () => {
  it("retains trusted Arabic and English aliases", () => {
    const r = resolveSemantics(profileColumns(parseCsvText("اسم العميل,Net Amount\nAhmed,10\nSalem,20")));
    expect(r.columns.map((c) => c.field)).toEqual(["customerName", "netAmount"]);
  });
  it("does not choose between overlapping aliases", () => {
    const r = resolveSemantics(profileColumns(parseCsvText("سعر البيع\n10\n20")));
    expect(r.evidence[0]?.candidates.filter((c) => c.score === 1).map((c) => c.field)).toContain("sellingPrice");
    expect(r.columns[0]?.field).toBeNull();
  });
  it("requires approval before a fuzzy candidate becomes effective", () => {
    const t = parseCsvText("صافي القيمة المحلي\n10\n20");
    expect(analyzeTable(t, "report.csv").columns[0]?.field).toBeNull();
    const approved = analyzeTable(t, "report.csv", { mappingDecisions: { 0: "netAmount" } });
    expect(approved.columns[0]?.field).toBe("netAmount");
    expect(approved.semantics?.[0]?.status).toBe("approved");
    expect(JSON.parse(JSON.stringify(approved)).semantics[0].field).toBe("netAmount");
  });
  it("rejects invalid canonical approvals", () => expect(() => resolveSemantics(profileColumns(table()), { 0: "fakeMoney" })).toThrow());
  it("does not let duplicate headers or targets silently select a column", () => {
    const t = gridToTable([["A", "B"], [1, 2], [3, 4]], null);
    expect(resolveSemantics(profileColumns(t), { 0: "netAmount", 1: "netAmount" }).columns.every((c) => c.field === null)).toBe(true);
    t.headers = ["Net Amount", "Net Amount"];
    expect(resolveSemantics(profileColumns(t)).columns.every((c) => c.field === null)).toBe(true);
  });
  it("allows explicit rejection of a known meaning", () => expect(resolveSemantics(profileColumns(parseCsvText("Net Amount\n10\n20")), { 0: null }).evidence[0]?.status).toBe("rejected"));
});

describe("bounded arithmetic evidence", () => {
  for (const operation of ["+", "−", "×"] as const) it(`validates ${operation} with separate source rows`, () => {
    const c = relationships(table(operation)).candidates.find((r) => r.columns.join() === "C,A,B" && r.operation === operation);
    expect(c?.status).toBe("supported");
    expect(c?.validation.rows.length).toBe(6);
    expect(c?.discovery.rows.some((r) => c.validation.rows.includes(r))).toBe(false);
  });
  it("exposes a discovery fit failing held-out validation", () => {
    const t = table(); t.rows[2] = [0, 4, 999];
    const c = relationships(t).candidates.find((r) => r.columns.join() === "C,A,B" && r.operation === "+");
    expect(c?.status).toBe("counterexamples"); expect(c?.counterexamples[0]?.row).toBe(t.sourceRows[2]);
  });
  it("excludes missing and invalid triples without replacing them with zero", () => {
    const t = table(); t.rows[0] = [null, 2, 0]; t.rows[1] = ["bad", 3, 2];
    const c = relationships(t).candidates.find((r) => r.columns.join() === "C,A,B" && r.operation === "+");
    expect(c?.excludedRows).toEqual(t.sourceRows.slice(0, 2)); expect(c?.status).toBe("supported");
  });
  it("keeps real zero and negatives", () => {
    const c = relationships(table()).candidates.find((r) => r.columns.join() === "C,A,B" && r.operation === "+");
    expect(c?.discovery.rows).toContain(2); expect(c?.validation.rows).toContain(4);
  });
  it("permits declared rounding tolerance", () => {
    const t = table(); t.rows = t.rows.map((r) => [r[0] ?? null, r[1] ?? null, Number(r[2]) + 0.005]);
    expect(relationships(t).candidates.some((c) => c.columns.join() === "C,A,B" && c.status === "supported")).toBe(true);
  });
  it("rejects constant/degenerate relationships", () => {
    const t = table(); t.rows = t.rows.map(() => [1, 2, 3]); expect(relationships(t).candidates).toEqual([]);
  });
  it("reports insufficient sample", () => { const t = table(); t.rows = t.rows.slice(0, 11); expect(relationships(t).status).toBe("insufficient"); });
  it("discloses bounded deterministic sampling", () => {
    const t = gridToTable([Array.from({ length: 10 }, (_, i) => `X${i}`), ...Array.from({ length: 1100 }, (_, i) => Array.from({ length: 10 }, (_, j) => i * (j + 1) + (i % 7)))], null);
    const r = relationships(t); expect(r.sampledRows).toBe(1000); expect(r.truncated).toBe(true); expect(r.candidates.length).toBeLessThanOrEqual(20);
    expect(r).toEqual(relationships(t));
  });
});