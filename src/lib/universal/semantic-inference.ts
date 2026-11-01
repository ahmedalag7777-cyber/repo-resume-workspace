import { getCanonicalFieldDefinitions } from "@/lib/report-intelligence/canonical-schema";
import { normHeader } from "./profile";
import type { ColumnProfile } from "./types";

export type MappingDecisions = Record<number, string | null>;
export interface SemanticEvidence {
  index: number;
  header: string;
  candidates: { field: string; score: number; evidence: string }[];
  field: string | null;
  status: "existing" | "approved" | "rejected" | "review" | "unmapped";
  conflicts: string[];
  sample: string[];
}

const definitions = getCanonicalFieldDefinitions();
const fields = new Set<string>(definitions.map((d) => d.field));
const words = (value: string) => new Set(value.toLowerCase().replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").split(/[\s_\-./()]+/).filter(Boolean));
function similarity(left: string, right: string) {
  const a = words(left), b = words(right);
  return [...a].filter((w) => b.has(w)).length / Math.max(1, new Set([...a, ...b]).size);
}

/** Header scores are heuristics, not probabilities. Values describe shape, never imply a business meaning. */
export function resolveSemantics(profiles: ColumnProfile[], decisions: MappingDecisions = {}) {
  for (const [index, field] of Object.entries(decisions)) {
    if (!profiles.some((p) => p.index === Number(index)) || (field !== null && !fields.has(field))) {
      throw new Error("اختيار معنى عمود غير صالح");
    }
  }
  const evidence: SemanticEvidence[] = profiles.map((p) => {
    const candidates = definitions.map((d) => {
      const exact = normHeader(p.name) === normHeader(d.field) || d.aliases.some((alias) => normHeader(alias) === normHeader(p.name));
      const score = exact ? 1 : Math.max(...d.aliases.map((alias) => similarity(p.name, alias)), similarity(p.name, d.field));
      return { field: d.field, score, evidence: exact ? "تطابق اسم أو مرادف" : "تشابه كلمات الترويسة" };
    }).filter((c) => c.score >= 0.5).sort((a, b) => b.score - a.score || a.field.localeCompare(b.field)).slice(0, 5);
    const conflicts: string[] = [];
    if (candidates.filter((c) => c.score === 1).length > 1) conflicts.push("الاسم يطابق أكثر من معنى");
    if (profiles.some((other) => other.index !== p.index && normHeader(other.name) === normHeader(p.name))) conflicts.push("ترويسة مكررة");
    const explicit = Object.prototype.hasOwnProperty.call(decisions, p.index);
    const trusted = !conflicts.length && (p.mappingMethod === "exact" || p.mappingMethod === "alias" || p.mappingMethod === "learned") && p.field && fields.has(p.field);
    const field = explicit ? decisions[p.index] ?? null : trusted ? p.field : null;
    return {
      index: p.index, header: p.name, candidates, field, sample: p.sample, conflicts,
      status: explicit ? field ? "approved" : "rejected" : trusted ? "existing" : candidates.length || conflicts.length ? "review" : "unmapped",
    } satisfies SemanticEvidence;
  });
  // Existing capabilities address fields and columns by name: refuse ambiguous identities, even after approval.
  for (const e of evidence) {
    if (e.field && evidence.some((other) => other.index !== e.index && other.field === e.field)) e.conflicts.push("أكثر من عمود للمعنى نفسه");
    if (e.conflicts.includes("ترويسة مكررة") || e.conflicts.includes("أكثر من عمود للمعنى نفسه")) {
      e.field = null; e.status = "review";
    }
  }
  const columns = profiles.map((p) => {
    const e = evidence.find((item) => item.index === p.index);
    if (!e) return p;
    return { ...p, field: e.field, mappingMethod: e.status === "approved" ? "manual" as const : e.field ? p.mappingMethod : "unmapped" as const,
      mappingConfidence: e.status === "approved" ? 1 : e.field ? p.mappingConfidence : 0,
      mappingNeedsReview: e.status === "review" || e.status === "unmapped" };
  });
  return { columns, evidence };
}