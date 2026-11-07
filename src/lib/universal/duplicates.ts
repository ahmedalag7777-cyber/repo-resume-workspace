export interface DupSource { id: string; file_name: string; row_count: number | null; column_count: number | null; created_at: string }

/** Same file name + same shape = repeated upload. Keeps the copy with most user work (decisions+tasks), then the newest; returns ids to remove. */
export function findDuplicateUploads(list: DupSource[], workCount: Record<string, number> = {}): string[] {
  const groups = new Map<string, DupSource[]>();
  for (const a of list) {
    const k = `${a.file_name.trim().toLowerCase()}|${a.row_count ?? ""}|${a.column_count ?? ""}`;
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  const remove: string[] = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const sorted = [...g].sort((x, y) => (workCount[y.id] ?? 0) - (workCount[x.id] ?? 0) || y.created_at.localeCompare(x.created_at));
    remove.push(...sorted.slice(1).map((a) => a.id));
  }
  return remove;
}
