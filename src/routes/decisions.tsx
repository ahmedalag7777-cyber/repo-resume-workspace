import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, XCircle, Inbox, Lightbulb, Compass, Info } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { buildInbox, inboxCounts, type InboxItem, type Verdict } from "@/lib/universal/decision-inbox";
import type { Insight } from "@/lib/universal/types";

export const Route = createFileRoute("/decisions")({
  head: () => ({
    meta: [
      { title: "صندوق القرارات — مستشار التقارير" },
      { name: "description", content: "كل الرؤى والتحذيرات من تقاريرك في مكان واحد: اعتمد أو ارفض كل توصية بملاحظة، والأخطر أولاً." },
      { property: "og:title", content: "صندوق القرارات — مستشار التقارير" },
      { property: "og:description", content: "قرّر في كل توصية من تقاريرك، والأخطر أولاً." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: DecisionsPage,
});

const kindIcon = { warning: AlertTriangle, opportunity: Lightbulb, advisory: Compass, guidance: Info } as const;
const sevLabel: Record<Insight["severity"], string> = { critical: "حرج", warning: "تحذير", opportunity: "فرصة", info: "معلومة" };
const sevCls: Record<Insight["severity"], string> = {
  critical: "bg-destructive/15 text-destructive", warning: "bg-primary/15 text-primary",
  opportunity: "bg-success/15 text-success", info: "bg-muted text-muted-foreground",
};
const filters: { id: Verdict | "critical"; label: string }[] = [
  { id: "pending", label: "بانتظار قرارك" }, { id: "critical", label: "حرجة" },
  { id: "approved", label: "معتمدة" }, { id: "rejected", label: "مرفوضة" },
];

function DecisionsPage() {
  const { user, loading } = useSession();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Verdict | "critical">("pending");
  const [q, setQ] = useState("");

  const { data: items } = useQuery({
    queryKey: ["decision_inbox", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [a, d] = await Promise.all([
        supabase.from("analyses").select("id, file_name, created_at, insights:result->insights").order("created_at", { ascending: false }).limit(100),
        supabase.from("decisions").select("analysis_id, finding_id, verdict, note"),
      ]);
      if (a.error) throw a.error;
      return buildInbox((a.data ?? []) as never, d.data ?? []);
    },
  });

  const counts = items ? inboxCounts(items) : null;
  const shown = useMemo(() => (items ?? []).filter((i) =>
    (filter === "critical" ? i.verdict === "pending" && i.insight.severity === "critical" : i.verdict === filter) &&
    (!q.trim() || `${i.insight.what} ${i.fileName}`.toLowerCase().includes(q.trim().toLowerCase()))), [items, filter, q]);

  const decide = async (item: InboxItem, verdict: "approved" | "rejected", note: string) => {
    if (!user) return;
    const { error } = await supabase.from("decisions").upsert(
      { user_id: user.id, analysis_id: item.analysisId, finding_id: item.insight.id, verdict, note: note.trim() || null },
      { onConflict: "analysis_id,finding_id" });
    if (error) { toast.error(error.message); return; }
    toast.success(verdict === "approved" ? "اعتُمدت التوصية" : "رُفضت التوصية");
    qc.invalidateQueries({ queryKey: ["decision_inbox"] });
    qc.invalidateQueries({ queryKey: ["decisions", item.analysisId] });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <Inbox className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">صندوق القرارات</h1>
            <p className="text-sm text-muted-foreground">كل توصيات تقاريرك في مكان واحد، الأخطر أولاً.</p>
          </div>
        </div>
        {!loading && !user && <p className="text-muted-foreground"><Link to="/auth" className="text-primary hover:underline">سجّل دخولك</Link> أولاً.</p>}
        {counts && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((f) => (
              <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "secondary"} onClick={() => setFilter(f.id)}>
                {f.label} ({f.id === "critical" ? counts.critical : counts[f.id]})
              </Button>
            ))}
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في التوصيات" aria-label="بحث في التوصيات" className="w-full sm:mr-auto sm:w-60" />
          </div>
        )}
        {items && !shown.length && (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            {items.length ? "لا توجد توصيات في هذا التصنيف." : <>لا توصيات بعد — <Link to="/analyze" className="text-primary hover:underline">حلّل تقريراً</Link>.</>}
          </p>
        )}
        <ul className="space-y-3">
          {shown.slice(0, 80).map((i) => <InboxCard key={`${i.analysisId}|${i.insight.id}`} item={i} onDecide={decide} />)}
        </ul>
        {shown.length > 80 && <p className="text-center text-xs text-muted-foreground">يُعرض أول 80 من {shown.length}؛ استخدم البحث للتضييق.</p>}
      </main>
    </div>
  );
}

function InboxCard({ item, onDecide }: { item: InboxItem; onDecide: (i: InboxItem, v: "approved" | "rejected", note: string) => void }) {
  const [note, setNote] = useState(item.note ?? "");
  const { insight } = item;
  const Icon = kindIcon[insight.kind] ?? Info;
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 ${sevCls[insight.severity]}`}>{sevLabel[insight.severity]}</span>
        <Link to="/analyses/$id" params={{ id: item.analysisId }} className="min-w-0 truncate text-muted-foreground hover:text-primary"><bdi>{item.fileName}</bdi></Link>
        {item.verdict !== "pending" && (
          <span className={`mr-auto inline-flex items-center gap-1 ${item.verdict === "approved" ? "text-success" : "text-destructive"}`}>
            {item.verdict === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {item.verdict === "approved" ? "معتمدة" : "مرفوضة"}
          </span>
        )}
      </div>
      <h2 className="mt-2 flex gap-2 font-semibold text-card-foreground"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{insight.what}</h2>
      {insight.soWhat && <p className="mt-1 text-sm text-muted-foreground">{insight.soWhat}</p>}
      {insight.whatNext && <p className="mt-2 text-sm text-foreground"><span className="text-primary">الخطوة التالية: </span>{insight.whatNext}</p>}
      {!!insight.proof.rowRefs.length && <p className="mt-1 text-xs text-muted-foreground">الدليل: صفوف {insight.proof.rowRefs.slice(0, 8).join("، ")}{insight.proof.rowRefs.length > 8 ? "…" : ""}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" aria-label="ملاحظة القرار" className="min-w-0 flex-1" />
        <Button size="sm" onClick={() => onDecide(item, "approved", note)}>اعتماد</Button>
        <Button size="sm" variant="outline" onClick={() => onDecide(item, "rejected", note)}>رفض</Button>
      </div>
    </li>
  );
}
