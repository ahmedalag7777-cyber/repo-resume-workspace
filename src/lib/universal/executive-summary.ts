import type { InboxItem } from "./decision-inbox";

export interface SummaryTask { id: string; title: string; status: string; priority: string; due_date: string | null; outcome_note: string | null; analysis_id: string }

export interface ExecutiveSummary {
  reports: number;
  findings: number;
  decided: number;
  decisionRate: number; // 0..100 integer
  approved: number;
  rejected: number;
  pendingCritical: InboxItem[];
  tasksOpen: number;
  tasksDone: number;
  overdue: SummaryTask[];
  outcomes: SummaryTask[];
  completionRate: number; // 0..100 integer
}

/** Workspace roll-up: only counts what the user actually decided and did; nothing is estimated. */
export function buildExecutiveSummary(items: InboxItem[], tasks: SummaryTask[], today: string): ExecutiveSummary {
  const approved = items.filter((i) => i.verdict === "approved").length;
  const rejected = items.filter((i) => i.verdict === "rejected").length;
  const decided = approved + rejected;
  const done = tasks.filter((t) => t.status === "done");
  const open = tasks.filter((t) => t.status !== "done");
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  return {
    reports: new Set(items.map((i) => i.analysisId)).size,
    findings: items.length,
    decided, approved, rejected,
    decisionRate: pct(decided, items.length),
    pendingCritical: items.filter((i) => i.verdict === "pending" && i.insight.severity === "critical").slice(0, 5),
    tasksOpen: open.length,
    tasksDone: done.length,
    overdue: open.filter((t) => t.due_date && t.due_date < today).sort((a, b) => a.due_date!.localeCompare(b.due_date!)),
    outcomes: done.filter((t) => t.outcome_note?.trim()),
    completionRate: pct(done.length, tasks.length),
  };
}
