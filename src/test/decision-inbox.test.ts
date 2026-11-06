import { describe, expect, it } from "vitest";
import { buildInbox, inboxCounts } from "@/lib/universal/decision-inbox";
import type { Insight } from "@/lib/universal/types";

const ins = (id: string, severity: Insight["severity"]): Insight => ({
  id, capability: "c", severity, kind: "warning", what: id, why: "", soWhat: "", impact: null, whatNext: "",
  whatIf: null, proof: { columns: [], rowRefs: [], metrics: [] }, owner: "sales", expectedOutcome: null, confidence: null,
});

describe("decision inbox", () => {
  const sources = [
    { id: "a", file_name: "old.xlsx", created_at: "2026-10-01", insights: [ins("x", "info"), ins("y", "critical")] },
    { id: "b", file_name: "new.xlsx", created_at: "2026-11-01", insights: [ins("x", "warning")] },
  ];

  it("puts pending critical findings first and decided ones last", () => {
    const items = buildInbox(sources, [{ analysis_id: "a", finding_id: "x", verdict: "approved", note: "done" }]);
    expect(items.map((i) => `${i.analysisId}:${i.insight.id}`)).toEqual(["a:y", "b:x", "a:x"]);
    expect(items[2]?.note).toBe("done");
  });

  it("a verdict on one report does not decide the same finding in another report", () => {
    const counts = inboxCounts(buildInbox(sources, [{ analysis_id: "a", finding_id: "x", verdict: "rejected", note: null }]));
    expect(counts).toEqual({ pending: 2, critical: 1, approved: 0, rejected: 1 });
  });
});
