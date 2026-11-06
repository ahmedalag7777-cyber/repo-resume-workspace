import type { Insight } from "./types";

export type Verdict = "pending" | "approved" | "rejected";
export interface InboxSource { id: string; file_name: string; created_at: string; insights: Insight[] }
export interface InboxDecision { analysis_id: string; finding_id: string; verdict: string; note: string | null }
export interface InboxItem { analysisId: string; fileName: string; createdAt: string; insight: Insight; verdict: Verdict; note: string | null; rank: number }

const SEVERITY_RANK = { critical: 0, warning: 1, opportunity: 2, info: 3 } as const;

/** Every saved finding across reports, joined with the user's verdict; pending and severe first, newest report first. */
export function buildInbox(sources: InboxSource[], decisions: InboxDecision[]): InboxItem[] {
  const byKey = new Map(decisions.map((d) => [`${d.analysis_id}|${d.finding_id}`, d]));
  const items: InboxItem[] = [];
  for (const s of sources) for (const insight of s.insights ?? []) {
    const d = byKey.get(`${s.id}|${insight.id}`);
    const verdict: Verdict = d?.verdict === "approved" || d?.verdict === "rejected" ? d.verdict : "pending";
    items.push({ analysisId: s.id, fileName: s.file_name, createdAt: s.created_at, insight, verdict, note: d?.note ?? null, rank: SEVERITY_RANK[insight.severity] ?? 4 });
  }
  return items.sort((a, b) =>
    Number(a.verdict !== "pending") - Number(b.verdict !== "pending") || a.rank - b.rank || b.createdAt.localeCompare(a.createdAt));
}

export function inboxCounts(items: InboxItem[]) {
  return {
    pending: items.filter((i) => i.verdict === "pending").length,
    critical: items.filter((i) => i.verdict === "pending" && i.insight.severity === "critical").length,
    approved: items.filter((i) => i.verdict === "approved").length,
    rejected: items.filter((i) => i.verdict === "rejected").length,
  };
}
