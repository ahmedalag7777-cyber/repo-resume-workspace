import { describe, it, expect } from "vitest";
import { findDuplicateUploads } from "@/lib/universal/duplicates";
const a = (id: string, name: string, rows: number, at: string) => ({ id, file_name: name, row_count: rows, column_count: 5, created_at: at });
describe("duplicate uploads", () => {
  it("keeps newest copy when no work recorded", () =>
    expect(findDuplicateUploads([a("1", "x.xlsx", 10, "2026-01-01"), a("2", "X.xlsx", 10, "2026-02-01")])).toEqual(["1"]));
  it("keeps the copy holding user decisions even if older", () =>
    expect(findDuplicateUploads([a("1", "x.xlsx", 10, "2026-01-01"), a("2", "x.xlsx", 10, "2026-02-01")], { "1": 3 })).toEqual(["2"]));
  it("different row count is not a duplicate", () =>
    expect(findDuplicateUploads([a("1", "x.xlsx", 10, "2026-01-01"), a("2", "x.xlsx", 11, "2026-02-01")])).toEqual([]));
});
