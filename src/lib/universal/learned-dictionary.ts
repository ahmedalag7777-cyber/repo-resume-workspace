import { getCanonicalFieldDefinitions } from "@/lib/report-intelligence/canonical-schema";
import { normHeader } from "./profile";
import type { MappingDecisions } from "./semantic-inference";
import type { ColumnProfile } from "./types";

export interface FeedbackRow { header_norm: string; field: string }

const FIELDS = new Set<string>(getCanonicalFieldDefinitions().map((d) => d.field));

/** Turns saved user feedback into the `learned` map consumed by profileColumns. Unknown fields are ignored. */
export function feedbackToLearned(rows: FeedbackRow[]): Record<string, string> {
  const learned: Record<string, string> = {};
  for (const r of rows) if (r.header_norm && FIELDS.has(r.field)) learned[r.header_norm] = r.field;
  return learned;
}

/** Only explicit approvals become memory; rejections and untouched columns never do. */
export function decisionsToFeedback(profiles: ColumnProfile[], decisions: MappingDecisions): FeedbackRow[] {
  const out = new Map<string, string>();
  for (const [index, field] of Object.entries(decisions)) {
    if (!field || !FIELDS.has(field)) continue;
    const profile = profiles.find((p) => p.index === Number(index));
    if (!profile) continue;
    const key = normHeader(profile.name);
    if (key) out.set(key, field);
  }
  return [...out].map(([header_norm, field]) => ({ header_norm, field }));
}
