import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, ListChecks, Gauge, BookMarked, Search, Trash2, GitCompare, ArrowUpRight, ArrowDownRight, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { compareReports, type ReportComparison } from "@/lib/universal/report-compare";
import { getCanonicalFieldDefinitions } from "@/lib/report-intelligence/canonical-schema";
import type { AnalysisResult } from "@/lib/universal/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحتي — مستشار التقارير" },
      { name: "description", content: "كل تقاريرك المحللة ومهامك ومعاني الأعمدة التي علّمتها للنظام، مع مقارنة أي تقريرين." },
      { property: "og:title", content: "لوحتي — مستشار التقارير" },
      { property: "og:description", content: "تقاريرك ومهامك ومقارنة التقارير في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: DashboardPage,
});

const fieldLabel = new Map<string, string>(getCanonicalFieldDefinitions().map((d) => [d.field as string, d.aliases[0] ?? d.field]));
const fmt = (n: number | null) => (n === null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n));
const dateFmt = (s: string) => new Date(s).toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" });

function DashboardPage() {
  const { user, loading } = useSession();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [comparison, setComparison] = useState<{ names: [string, string]; c: ReportComparison } | null>(null);

  const { data: analyses } = useQuery({
    queryKey: ["analyses_list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, file_name, row_count, column_count, quality_score, available_count, created_at, archetype_title:result->archetype->>title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: tasks } = useQuery({
    queryKey: ["work_tasks", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("work_tasks").select("id, status, priority, title, due_date, analysis_id").order("due_date")).data ?? [],
  });
  const { data: memory } = useQuery({
    queryKey: ["mapping_feedback", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("mapping_feedback").select("id, header_norm, field, created_at").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(
    () => (analyses ?? []).filter((a) => !q.trim() || `${a.file_name} ${a.archetype_title ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())),
    [analyses, q],
  );
  const open = (tasks ?? []).filter((t) => t.status !== "done");
  const urgent = open.filter((t) => t.priority === "high").slice(0, 5);
  const avgQuality = analyses?.length ? Math.round(analyses.reduce((s, a) => s + Number(a.quality_score ?? 0), 0) / analyses.length) : null;
  const rows = (analyses ?? []).reduce((s, a) => s + (a.row_count ?? 0), 0);

  const togglePick = (id: string) => {
    setComparison(null);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
  };

  const runCompare = async () => {
    if (picked.length !== 2) return;
    const { data, error } = await supabase.from("analyses").select("id, file_name, created_at, result").in("id", picked);
    if (error || !data || data.length !== 2) { toast.error("تعذر تحميل التقريرين"); return; }
    const [a, b] = [...data].sort((x, y) => x.created_at.localeCompare(y.created_at));
    setComparison({ names: [a!.file_name, b!.file_name], c: compareReports(a!.result as unknown as AnalysisResult, b!.result as unknown as AnalysisResult) });
  };

  const removeAnalysis = async (id: string, name: string) => {
    if (!window.confirm(`حذف تحليل «${name}» ومهامه وقراراته؟`)) return;
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    setPicked((p) => p.filter((x) => x !== id));
    qc.invalidateQueries({ queryKey: ["analyses_list"] });
    qc.invalidateQueries({ queryKey: ["work_tasks"] });
  };

  const forget = async (id: string) => {
    const { error } = await supabase.from("mapping_feedback").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("لن يُطبَّق هذا المعنى تلقائياً بعد الآن"); qc.invalidateQueries({ queryKey: ["mapping_feedback"] }); }
  };

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="text-muted-foreground"><Link to="/auth" className="text-primary hover:underline">سجّل دخولك</Link> لعرض لوحتك.</p>
        </main>
      </div>
    );
  }

  const kpis = [
    { icon: FileSpreadsheet, label: "تقارير محللة", value: fmt(analyses?.length ?? 0), hint: `${fmt(rows)} صف` },
    { icon: ListChecks, label: "مهام مفتوحة", value: fmt(open.length), hint: `${urgent.length ? `${open.filter((t) => t.priority === "high").length} عالية الأولوية` : "لا مهام عاجلة"}` },
    { icon: Gauge, label: "متوسط جودة البيانات", value: avgQuality === null ? "—" : `${avgQuality}/100`, hint: "عبر كل التقارير" },
    { icon: BookMarked, label: "معانٍ يتذكرها النظام", value: fmt(memory?.length ?? 0), hint: "تُطبَّق تلقائياً" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">لوحتي</h1>
            <p className="mt-1 text-sm text-muted-foreground">كل تقاريرك ومهامك وما تعلّمه النظام منك.</p>
          </div>
          <Button asChild className="bg-gradient-gold text-primary-foreground shadow-glow"><Link to="/analyze"><Plus className="h-4 w-4" /> تحليل تقرير جديد</Link></Button>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="ملخص">
          {kpis.map((k) => (
            <div key={k.label} className="lift rounded-2xl border border-border bg-card p-4">
              <k.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-bold text-card-foreground">{k.value}</p>
              <p className="text-sm text-foreground">{k.label}</p>
              <p className="text-xs text-muted-foreground">{k.hint}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2" aria-label="تقاريري">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">تقاريري</h2>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم الملف أو النوع" className="pr-9" aria-label="بحث في التقارير" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
              <GitCompare className="h-4 w-4 text-primary" />
              <span>اختر تقريرين لمقارنة إجمالياتهما الموثّقة ({picked.length}/2)</span>
              <Button size="sm" variant="secondary" disabled={picked.length !== 2} onClick={runCompare} className="mr-auto">قارن</Button>
            </div>

            {comparison && <ComparisonPanel names={comparison.names} c={comparison.c} />}

            {analyses && !analyses.length && (
              <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                لا تقارير بعد — <Link to="/analyze" className="text-primary hover:underline">ارفع أول تقرير</Link>.
              </p>
            )}
            <ul className="space-y-2">
              {filtered.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <input type="checkbox" checked={picked.includes(a.id)} onChange={() => togglePick(a.id)} aria-label={`اختيار ${a.file_name} للمقارنة`} className="h-4 w-4 accent-[var(--color-primary)]" />
                  <Link to="/analyses/$id" params={{ id: a.id }} className="min-w-0 flex-1">
                    <p className="truncate font-medium text-card-foreground">{a.file_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {dateFmt(a.created_at)} • {fmt(a.row_count)} صف × {a.column_count} عمود • {a.archetype_title || "تقرير عام"}
                    </p>
                  </Link>
                  <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground sm:inline">جودة {Math.round(Number(a.quality_score ?? 0))}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeAnalysis(a.id, a.file_name)} aria-label={`حذف ${a.file_name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-4" aria-label="مهام عاجلة">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-card-foreground">مهام عاجلة</h2>
                <Link to="/tasks" className="text-xs text-primary hover:underline">كل المهام</Link>
              </div>
              {!urgent.length && <p className="mt-3 text-sm text-muted-foreground">لا مهام عالية الأولوية مفتوحة.</p>}
              <ul className="mt-3 space-y-2">
                {urgent.map((t) => (
                  <li key={t.id} className="rounded-lg bg-secondary/50 p-2 text-sm">
                    <p className="text-foreground">{t.title}</p>
                    {t.due_date && <p className="text-xs text-muted-foreground">الاستحقاق {t.due_date}</p>}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4" aria-label="ذاكرة المعاني">
              <h2 className="font-semibold text-card-foreground">ذاكرة معاني الأعمدة</h2>
              <p className="mt-1 text-xs text-muted-foreground">عندما تعتمد معنى عمود، يتذكره النظام ويطبقه على تقاريرك القادمة.</p>
              {!memory?.length && <p className="mt-3 text-sm text-muted-foreground">لم تعتمد أي معنى بعد.</p>}
              <ul className="mt-3 space-y-1.5">
                {memory?.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-foreground"><bdi>{m.header_norm}</bdi> ← {fieldLabel.get(m.field) ?? m.field}</span>
                    <Button size="sm" variant="ghost" onClick={() => forget(m.id)} aria-label={`نسيان ${m.header_norm}`}>نسيان</Button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ComparisonPanel({ names, c }: { names: [string, string]; c: ReportComparison }) {
  return (
    <section className="animate-fade-up space-y-4 rounded-2xl border border-primary/40 bg-card p-4 shadow-glow" aria-label="نتيجة المقارنة">
      <h3 className="font-semibold text-card-foreground">
        <bdi>{names[0]}</bdi> ← <bdi>{names[1]}</bdi>
      </h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-secondary/50 p-3"><p className="text-muted-foreground">الصفوف</p><p className="text-foreground">{fmt(c.rows.before)} ← {fmt(c.rows.after)} ({c.rows.delta >= 0 ? "+" : ""}{fmt(c.rows.delta)})</p></div>
        <div className="rounded-lg bg-secondary/50 p-3"><p className="text-muted-foreground">جودة البيانات</p><p className="text-foreground">{c.quality.before} ← {c.quality.after}</p></div>
      </div>
      {!c.comparable ? (
        <p className="text-sm text-muted-foreground">لا توجد أعمدة رقمية مشتركة بإجماليات موثّقة في التقريرين، لذلك لا تُعرض فروق.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground"><tr><th className="p-2 text-right font-normal">العمود</th><th className="p-2 text-right font-normal">قبل</th><th className="p-2 text-right font-normal">بعد</th><th className="p-2 text-right font-normal">الفرق</th></tr></thead>
            <tbody>
              {c.columns.map((col) => {
                const up = (col.delta ?? 0) >= 0;
                const Icon = up ? ArrowUpRight : ArrowDownRight;
                return (
                  <tr key={col.column} className="border-t border-border">
                    <td className="p-2 text-foreground"><bdi>{col.column}</bdi></td>
                    <td className="p-2 text-muted-foreground">{fmt(col.before)}</td>
                    <td className="p-2 text-foreground">{fmt(col.after)}</td>
                    <td className={`p-2 ${up ? "text-success" : "text-destructive"}`}>
                      <span className="inline-flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{up ? "+" : ""}{fmt(col.delta)}{col.pct !== null && ` (${up ? "+" : ""}${col.pct}%)`}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(!!c.added.length || !!c.removed.length) && (
        <p className="text-xs text-muted-foreground">
          {!!c.added.length && <>أعمدة جديدة: <bdi>{c.added.join("، ")}</bdi>. </>}
          {!!c.removed.length && <>أعمدة اختفت: <bdi>{c.removed.join("، ")}</bdi>.</>}
        </p>
      )}
      <p className="text-xs text-muted-foreground">تُقارن فقط الإجماليات التي أعاد النظام حسابها من خلايا الملف وطابقت.</p>
    </section>
  );
}
