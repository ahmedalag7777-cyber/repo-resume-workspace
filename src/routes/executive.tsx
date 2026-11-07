import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, Target, CheckCircle2, AlertTriangle, Clock, Trophy, FileText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { buildInbox } from "@/lib/universal/decision-inbox";
import { buildExecutiveSummary, type SummaryTask } from "@/lib/universal/executive-summary";

export const Route = createFileRoute("/executive")({
  head: () => ({
    meta: [
      { title: "التقرير التنفيذي — مستشار التقارير" },
      { name: "description", content: "ملخص تنفيذي قابل للطباعة: قراراتك، المهام المتأخرة، والنتائج الفعلية التي حققتها من تقاريرك." },
      { property: "og:title", content: "التقرير التنفيذي — مستشار التقارير" },
      { property: "og:description", content: "قراراتك ومهامك ونتائجك الفعلية في صفحة واحدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: ExecutivePage,
});

function ExecutivePage() {
  const { user, loading } = useSession();
  const { data: s } = useQuery({
    queryKey: ["executive", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [a, d, t] = await Promise.all([
        supabase.from("analyses").select("id, file_name, created_at, insights:result->insights").order("created_at", { ascending: false }).limit(100),
        supabase.from("decisions").select("analysis_id, finding_id, verdict, note"),
        supabase.from("work_tasks").select("id, title, status, priority, due_date, outcome_note, analysis_id").order("updated_at", { ascending: false }),
      ]);
      if (a.error) throw a.error;
      if (t.error) throw t.error;
      return buildExecutiveSummary(buildInbox((a.data ?? []) as never, d.data ?? []), (t.data ?? []) as SummaryTask[], new Date().toISOString().slice(0, 10));
    },
  });

  const kpis = s ? [
    { icon: FileText, label: "تقارير محللة", value: s.reports },
    { icon: Target, label: "نسبة الحسم في التوصيات", value: `${s.decisionRate}%`, sub: `${s.decided} من ${s.findings}` },
    { icon: CheckCircle2, label: "نسبة إنجاز المهام", value: `${s.completionRate}%`, sub: `${s.tasksDone} منجزة · ${s.tasksOpen} مفتوحة` },
    { icon: Trophy, label: "نتائج موثقة", value: s.outcomes.length },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden"><SiteHeader /></div>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">التقرير التنفيذي</h1>
            <p className="text-sm text-muted-foreground">ما قررته، ما نفذته، وما حققته فعلاً — من بياناتك المسجلة فقط، بلا تقديرات.</p>
          </div>
          {s && <Button variant="secondary" className="print:hidden" onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة / PDF</Button>}
        </div>
        {!loading && !user && <p className="text-muted-foreground"><Link to="/auth" className="text-primary hover:underline">سجّل دخولك</Link> أولاً.</p>}
        {s && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.label} className="glass rounded-xl p-4">
                  <k.icon className="h-5 w-5 text-primary" />
                  <div className="mt-2 font-display text-2xl font-bold text-foreground">{k.value}</div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  {k.sub && <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>}
                </div>
              ))}
            </div>
            <Section icon={AlertTriangle} title="توصيات حرجة تنتظر قرارك" empty="لا توجد توصيات حرجة معلّقة.">
              {s.pendingCritical.map((i) => (
                <li key={`${i.analysisId}|${i.insight.id}`} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-foreground">{i.insight.what}</span>
                  <Link to="/analyses/$id" params={{ id: i.analysisId }} className="text-xs text-primary hover:underline print:hidden">{i.fileName}</Link>
                </li>
              ))}
            </Section>
            <Section icon={Clock} title="مهام متأخرة" empty="لا توجد مهام متأخرة.">
              {s.overdue.map((t) => (
                <li key={t.id} className="flex justify-between gap-2"><span className="text-foreground">{t.title}</span><span className="text-xs text-destructive">استحقت {t.due_date}</span></li>
              ))}
            </Section>
            <Section icon={Trophy} title="النتائج المحققة" empty={<>لا نتائج موثقة بعد — عند إنجاز مهمة في <Link to="/tasks" className="text-primary hover:underline">المهام</Link> اكتب ما تحقق.</>}>
              {s.outcomes.map((t) => (
                <li key={t.id}><div className="font-semibold text-foreground">{t.title}</div><div className="text-sm text-success">{t.outcome_note}</div></li>
              ))}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, empty, children }: { icon: typeof Clock; title: string; empty: React.ReactNode; children: React.ReactNode[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 break-inside-avoid">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-foreground"><Icon className="h-5 w-5 text-primary" />{title}</h2>
      {children.length ? <ul className="space-y-2 text-sm">{children}</ul> : <p className="text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}
