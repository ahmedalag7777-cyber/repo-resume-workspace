import { describe, expect, it } from "vitest";
import { gridToTable } from "@/lib/universal/parse";
import { profileColumns } from "@/lib/universal/profile";
import { verifyNumericTotals } from "@/lib/universal/verification";
import { analyzeTable } from "@/lib/universal/pipeline";
import { analyzeMatrix, detectMatrix } from "@/lib/universal/matrix";

describe("source evidence and arithmetic verification", () => {
  it("records total removal with original row identity", () => {
    const t = gridToTable([["عميل", "sales"], ["أحمد", 10], ["الإجمالي الكلي", 10]], null);
    expect(t.audit?.excluded).toEqual([{ row: 3, reason: "total", label: "الإجمالي الكلي" }]);
    expect(t.sourceRows).toEqual([2]);
  });
  it("does not remove a legitimate entity whose name starts with Total", () => {
    expect(gridToTable([["customer", "sales"], ["Total Trading", 10]], null).rows).toEqual([["Total Trading", 10]]);
  });
  it("records extra cells instead of silently hiding a shape mismatch", () => {
    const t = gridToTable([["customer", "sales"], ["Ahmed", 10, 20]], null);
    expect(t.audit?.shapeIssues).toEqual([{ row: 2, expected: 2, actual: 3, extraCells: [20] }]);
  });
  it("uses decimal arithmetic for actual reported profile totals", () => {
    const t = gridToTable([["customer", "sales"], ["Ahmed", 0.1], ["Nora", 0.2]], null);
    const r = analyzeTable(t, "sales.csv");
    expect(r.columns.find((c) => c.name === "sales")?.sum).toBe(0.3);
    expect(r.verification?.[0]).toMatchObject({ sourceTotal: 0.3, profileTotal: 0.3, matches: true, numericRows: 2 });
  });
  it("detects an incorrectly reported total independently", () => {
    const t = gridToTable([["customer", "sales"], ["Ahmed", 10]], null);
    const cols = profileColumns(t).map((c) => c.name === "sales" ? { ...c, sum: 999 } : c);
    expect(verifyNumericTotals(t, cols)[0]).toMatchObject({ sourceTotal: 10, profileTotal: 999, matches: false });
  });
  it("does not remove a dominant legitimate customer as an assumed total", () => {
    const t = gridToTable([["customer", "يناير", "فبراير", "مارس"], ["Large customer", 1000, 1000, 1000],
      ...Array.from({ length: 11 }, (_, i) => [`Customer ${i}`, 1, 1, 1])], null);
    expect(analyzeMatrix(t, "customers.csv")?.excludedTotalRows).toEqual([]);
    expect(analyzeMatrix(t, "customers.csv")?.series[0]?.value).toBe(1011);
  });
  it("does not manufacture lost-customer evidence from missing monthly values", () => {
    const t = gridToTable([["customer", "يناير", "فبراير", "مارس"], ["Ahmed", 100, null, null], ["Nora", 10, 10, 10], ["Salem", 20, 20, 20]], null);
    expect(analyzeMatrix(t, "customers.csv")).toBeNull();
  });
  it("does not clamp returns to zero activity", () => {
    const t = gridToTable([["customer", "يناير", "فبراير", "مارس"], ["Ahmed", 100, -10, 20], ["Nora", 10, 10, 10], ["Salem", 20, 20, 20]], null);
    expect(analyzeMatrix(t, "customers.csv")).toBeNull();
  });
  it("rejects repeated ambiguous month columns", () => {
    const t = { headers: ["customer", "يناير", "فبراير", "يناير"], rows: [["Ahmed", 1, 2, 3]], sheet: null, headerRow: 1, sourceRows: [2] };
    expect(detectMatrix(t)).toBeNull();
  });
});