import { describe, expect, it } from "vitest";
import { htmlToGrids } from "@/lib/universal/docx-grid";
import { itemsToGrid } from "@/lib/universal/pdf-grid";
import { tsvToGrid } from "@/lib/universal/ocr-grid";
import { gridToTable, toDate, toNumber } from "@/lib/universal/parse";
import { providerPermission, selectFreeRuntime } from "@/lib/universal/free-runtime";
import { mean, std, sum } from "@/lib/universal/stats";
import { analyzeTable } from "@/lib/universal/pipeline";

describe("document foundation", () => {
  it("preserves independent Word tables and empty cells", () => {
    expect(htmlToGrids("<table><tr><td>عميل</td><td>قيمة</td></tr><tr><td>أحمد</td><td></td></tr></table><table><tr><td>ثان</td></tr></table>", document))
      .toEqual([[["عميل", "قيمة"], ["أحمد", null]], [["ثان"]]]);
  });
  it("reconstructs aligned PDF columns and source row evidence", () => {
    const grid = itemsToGrid([{ x: 10, y: 100, str: "customer" }, { x: 100, y: 100, str: "sales" },
      { x: 10, y: 80, str: "Ahmed" }, { x: 100, y: 80, str: "125.50" }]);
    const table = gridToTable(grid, "page 1");
    expect(table.rows).toEqual([["Ahmed", "125.50"]]);
    expect(table.sourceRows).toEqual([2]);
    expect(analyzeTable(table, "sales.pdf").rowCount).toBe(1);
  });
  it("retains merged Word column positions without repeating monetary values", () => {
    expect(htmlToGrids('<table><tr><td colspan="2">المبيعات</td><td>القيمة</td></tr><tr><td rowspan="2">أحمد</td><td>يناير</td><td>10</td></tr><tr><td>فبراير</td><td>20</td></tr></table>', document))
      .toEqual([[["المبيعات", null, "القيمة"], ["أحمد", "يناير", "10"], ["أحمد", "فبراير", "20"]]]);
  });
  it("uses OCR word positions rather than single text-space splitting", () => {
    const tsv = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n" +
      "5\t1\t1\t1\t1\t1\t10\t10\t40\t10\t95\tCustomer\n" +
      "5\t1\t1\t1\t1\t2\t180\t10\t40\t10\t95\tSales\n" +
      "5\t1\t1\t1\t2\t1\t10\t40\t40\t10\t95\tAhmed\n" +
      "5\t1\t1\t1\t2\t2\t180\t40\t40\t10\t95\t125";
    expect(tsvToGrid(tsv)).toEqual([["Customer", "Sales"], ["Ahmed", "125"]]);
  });
  it("does not turn entity identifiers into money", () => expect(toNumber("عميل 125")).toBeNull());
  it("keeps OCR headers with unequal word heights on one source line", () => {
    const tsv = "4\t1\t1\t1\t1\t0\t52\t43\t1092\t44\t-1\t\n" +
      "5\t1\t1\t1\t1\t1\t52\t43\t173\t44\t96\tCustomer\n" +
      "5\t1\t1\t1\t1\t2\t533\t48\t81\t26\t95\tDate\n" +
      "5\t1\t1\t1\t1\t3\t1052\t47\t92\t27\t96\tSales";
    expect(tsvToGrid(tsv)).toEqual([["Customer", "Date", "Sales"]]);
  });
  it("normalizes Arabic decimal amounts", () => expect(toNumber("١٬٢٣٤٫٥٠")).toBe(1234.5));
  it("rejects impossible dates", () => expect(toDate("31/02/2026")).toBeNull());
  it("excludes Arabic total footers without double counting", () => {
    expect(gridToTable([["عميل", "قيمة"], ["أحمد", 10], ["الإجمالي الكلي", 10]], null).rows).toEqual([["أحمد", 10]]);
  });
  it("sums decimals exactly at the aggregation boundary", () => expect(sum([0.1, 0.2])).toBe(0.3));
  it("verifies baseline statistical values independently", () => {
    expect(mean([2, 4, 6])).toBe(4); expect(std([2, 4, 6])).toBe(2);
  });
  it("blocks paid inference under the zero-dollar requirement", () => expect(providerPermission("paid-hosted").allowed).toBe(false));
  it("continues locally when a hosted provider is unavailable", () => {
    expect(selectFreeRuntime("free-hosted")).toMatchObject({ provider: "deterministic", cost: 0, networkInference: false, fallback: true });
  });
});