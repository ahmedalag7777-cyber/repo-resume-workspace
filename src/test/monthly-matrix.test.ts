import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsvText } from "@/lib/universal/parse";
import { analyzeTable } from "@/lib/universal/pipeline";

const t = parseCsvText(readFileSync("fixtures/customer-monthly-matrix.csv", "utf8"));
const r = analyzeTable(t, "تقرير_مشتريات_العملاء.csv");

describe("monthly customer matrix", () => {
  it("excludes the grand-total row from analysis", () => {
    expect(r.segments.some((s) => s.name.includes("الإجمالي"))).toBe(false);
  });
  it("flags customers with no purchases in the last two months as lost", () => {
    expect(r.insights.find((i) => i.id === "mx-lost")?.what).toMatch(/^6 عميل/);
  });
  it("treats month columns as periods, not unknown fields", () => {
    expect(r.series.map((s) => s.period)).toEqual(["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس"]);
    expect(r.insights.some((i) => i.id === "mapping-review")).toBe(false);
  });
  it("detects new customers in the latest month", () => {
    expect(r.merchant?.kpis.find((k) => k.label.includes("جدد"))?.value).toBe("1");
  });
});
