import { getCanonicalFieldDefinitions } from "@/lib/report-intelligence/canonical-schema";
import type { MappingDecisions, SemanticEvidence } from "@/lib/universal/semantic-inference";

const definitions = getCanonicalFieldDefinitions();
const label = (field: string) => definitions.find((d) => d.field === field)?.aliases[0] ?? field;
const statusLabel = { existing: "معنى معروف", approved: "اعتمدته", rejected: "دون تعيين معنى", review: "بحاجة لمراجعة", unmapped: "معنى غير معروف" };

export function SemanticReview({ evidence, decisions, onChange, disabled }: {
  evidence: SemanticEvidence[]; decisions: MappingDecisions;
  onChange: (decisions: MappingDecisions) => void; disabled: boolean;
}) {
  return <section aria-label="مراجعة معاني الأعمدة" className="space-y-4 border-y border-border py-5">
    <h3 className="font-semibold text-foreground">معاني الأعمدة</h3>
    {evidence.map((e) => <div key={e.index} className="space-y-2">
      <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium text-foreground">{e.header}</span><span className="text-muted-foreground">{statusLabel[e.status]}</span></div>
      <p className="break-words text-xs text-muted-foreground">{e.sample.join(" • ")}</p>
      {!!e.candidates.length && <p className="text-xs text-muted-foreground">{e.candidates.map((c) => `${label(c.field)}: ${c.evidence} (${Math.round(c.score * 100)}/100)`).join(" • ")}</p>}
      {!!e.conflicts.length && <p className="text-xs text-destructive">{e.conflicts.join(" • ")}</p>}
      <label className="block text-sm text-foreground">معنى {e.header}
        <select aria-label={`معنى ${e.header}`} disabled={disabled} value={Object.prototype.hasOwnProperty.call(decisions, e.index) ? decisions[e.index] ?? "none" : "keep"}
          onChange={(event) => { const next = { ...decisions }; if (event.target.value === "keep") delete next[e.index]; else next[e.index] = event.target.value === "none" ? null : event.target.value; onChange(next); }}
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground">
          <option value="keep">{e.status === "existing" ? `الإبقاء: ${label(e.field ?? "")}` : "ترك المعنى غير المعتمد"}</option>
          <option value="none">دون تعيين معنى</option>
          {definitions.map((d) => <option key={d.field} value={d.field}>{d.aliases[0]}</option>)}
        </select>
      </label>
    </div>)}
  </section>;
}