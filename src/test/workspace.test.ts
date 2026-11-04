import { describe, expect, it } from "vitest";
import { decisionsToFeedback, feedbackToLearned } from "@/lib/universal/learned-dictionary";
import { compareReports } from "@/lib/universal/report-compare";
import { profileColumns } from "@/lib/universal/profile";
import { analyzeTable } from "@/lib/universal/pipeline";
import { resolveSemantics } from "@/lib/universal/semantic-inference";
import type { RawTable } from "@/lib/universal/types";

const table = (headers: string[], rows: (string | number | null)[][]): RawTable => ({
  sheet: null, headers, rows, headerRow: 0, sourceRows: rows.map((_, i) => i + 2),
});

describe("persistent meaning dictionary", () => {
  const t = table(["Zbon Name", "Qty X"], [["A", 1], ["B", 2]]);
  const profiles = profileColumns(t);

  it("remembers only approved meanings, never rejections", () => {
    const fb = decisionsToFeedback(profiles, { 0: "customerName", 1: null });
    expect(fb).toEqual([{ header_norm: "zbonname", field: "customerName" }]);
  });

  it("applies a remembered meaning automatically to the next report", () => {
    const learned = feedbackToLearned([{ header_norm: "zbonname", field: "customerName" }]);
    const next = resolveSemantics(profileColumns(t, learned));
    expect(next.evidence[0]?.status).toBe("existing");
    expect(next.evidence[0]?.field).toBe("customerName");
  });

  it("ignores remembered meanings that are not in the dictionary", () => {
    expect(feedbackToLearned([{ header_norm: "x", field: "made_up_field" }])).toEqual({});
  });
});

describe("report comparison", () => {
  const jan = analyzeTable(table(["product", "amount"], [["A", 100], ["B", 50]]), "jan.csv");
  const feb = analyzeTable(table(["product", "amount", "region"], [["A", 120], ["B", 60], ["C", 20, "N"]]), "feb.csv");

  it("compares verified totals: 150 → 200 is +50 (+33.3%)", () => {
    const c = compareReports(jan, feb);
    const amount = c.columns.find((x) => x.column === "amount");
    expect(amount).toMatchObject({ before: 150, after: 200, delta: 50, pct: 33.3 });
    expect(c.rows.delta).toBe(1);
    expect(c.added).toEqual(["region"]);
  });

  it("never compares a column whose total failed verification", () => {
    const broken = structuredClone(feb);
    broken.verification = broken.verification?.map((v) => ({ ...v, matches: false }));
    expect(compareReports(jan, broken).comparable).toBe(false);
  });
});
