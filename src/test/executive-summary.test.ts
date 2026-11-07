import { describe, it, expect } from "vitest";
import { buildExecutiveSummary } from "@/lib/universal/executive-summary";

const item = (a: string, id: string, sev: string, verdict: string) =>
  ({ analysisId: a, fileName: "f", createdAt: "2026-01-01", insight: { id, severity: sev, what: id } as never, verdict, note: null, rank: 0 }) as never;
const task = (id: string, status: string, due: string | null, outcome: string | null = null) =>
  ({ id, title: id, status, priority: "high", due_date: due, outcome_note: outcome, analysis_id: "a" });

describe("executive summary", () => {
  const s = buildExecutiveSummary(
    [item("a", "1", "critical", "pending"), item("a", "2", "warning", "approved"), item("b", "3", "info", "rejected"), item("b", "4", "critical", "approved")],
    [task("t1", "done", null, "زادت المبيعات 8%"), task("t2", "open", "2026-01-01"), task("t3", "open", "2026-12-01"), task("t4", "done", null, "  ")],
    "2026-06-01");
  it("decision rate counts only real verdicts", () => { expect(s.decided).toBe(3); expect(s.decisionRate).toBe(75); expect(s.reports).toBe(2); });
  it("only pending critical findings are flagged", () => expect(s.pendingCritical.map((i) => i.insight.id)).toEqual(["1"]));
  it("overdue = open tasks past due date", () => expect(s.overdue.map((t) => t.id)).toEqual(["t2"]));
  it("outcomes require a written result", () => expect(s.outcomes.map((t) => t.id)).toEqual(["t1"]));
  it("completion rate", () => expect(s.completionRate).toBe(50));
  it("empty workspace gives zeros, not NaN", () => { const e = buildExecutiveSummary([], [], "2026-01-01"); expect(e.decisionRate).toBe(0); expect(e.completionRate).toBe(0); });
});
