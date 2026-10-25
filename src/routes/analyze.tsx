import { SiteHeader } from "@/components/site-header";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { parseFile, sha256 } from "@/lib/universal/parse";
import { analyzeTable, reportSignature } from "@/lib/universal/pipeline";
import type { AnalysisResult, RawTable } from "@/lib/universal/types";
import { SUPPORTED_FILE_ACCEPT } from "@/lib/universal/extraction";
import { ExtractionReview } from "@/components/extraction-review";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "تحليل تقرير جديد — مستشار التقارير" },
      { name: "description", content: "حلل Excel وCSV وJSON، وراجع الجداول المستخرجة من PDF وWord والصور قبل اعتمادها." },
      { property: "og:title", content: "تحليل تقرير جديد — مستشار التقارير" },
      { property: "og:description", content: "ارفع ملفك واحصل على رؤى وتوصيات ومهام يومية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyzePage,
});

function AnalyzePage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState<{ file: File; tables: RawTable[] } | null>(null);
  const [selected, setSelected] = useState(0);

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error("سجّل دخولك أولاً لحفظ التحليل");
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      setStatus("جارٍ قراءة الملف…");
      const tables = await parseFile(file, { onProgress: setStatus });
      if (!tables.length) throw new Error("لم يتم العثور على جدول بيانات في الملف");
      const table = tables[0];
      if (!table) throw new Error("لم يتم العثور على جدول بيانات في الملف");
      if (tables.length > 1 || table.extraction?.reviewRequired) {
        setPending({ file, tables }); setSelected(0);
      } else await saveAnalysis(file, table);
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); setStatus(""); }
  };

  const saveAnalysis = async (file: File, table: RawTable) => {
    if (!user) throw new Error("سجّل دخولك أولاً لحفظ التحليل");
      setStatus("جارٍ التحليل الذكي…");
      const hash = await sha256(file);
      const signature = reportSignature(table);

      // Decision replay: how many previous analyses share this report family?
      const { data: prior } = await supabase
        .from("analyses")
        .select("id")
        .eq("user_id", user.id)
        .eq("file_hash", hash);

      const result: AnalysisResult = analyzeTable(table, file.name, {
        priorSameSignature: prior?.length ?? 0,
      });

      setStatus("جارٍ الحفظ…");
      const { data: row, error } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_hash: hash || signature,
          row_count: result.rowCount,
          column_count: result.columnCount,
          archetype: result.archetype.id,
          domain: result.domains.join(", ") || null,
          quality_score: result.qualityScore,
          available_count: result.capabilities.filter((c) => c.status === "AVAILABLE").length,
          engine_version: result.engineVersion,
          result: result as never,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (result.tasks.length) {
        const today = new Date();
        const { error: tErr } = await supabase.from("work_tasks").insert(
          result.tasks.map((t) => ({
            user_id: user.id,
            analysis_id: row.id,
            finding_id: t.findingId,
            role: t.role,
            title: t.title,
            detail: t.detail,
            priority: t.priority,
            due_date: new Date(today.getTime() + t.dueInDays * 86400000).toISOString().slice(0, 10),
            status: "open",
          })),
        );
        if (tErr) throw tErr;
      }

      toast.success("تم التحليل والحفظ بنجاح");
      setPending(null);
      navigate({ to: "/analyses/$id", params: { id: row.id } });
  };

  const confirmTable = async () => {
    const table = pending?.tables[selected];
    if (!pending || !table) return;
    setBusy(true);
    try { await saveAnalysis(pending.file, table); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); setStatus(""); }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground">تحليل تقرير جديد</h1>
        <p className="mt-2 text-muted-foreground">
          Excel • CSV • JSON • PDF • Word • صور
        </p>

        {!pending && <Button
          variant="outline"
          type="button"
          disabled={busy || loading}
          onClick={() => inputRef.current?.click()}
          className="mt-8 flex h-auto w-full flex-col items-center justify-center gap-3 whitespace-normal rounded-lg border-2 border-dashed border-border bg-card px-6 py-16 text-center transition-colors hover:border-primary hover:bg-accent disabled:opacity-60 [&_svg]:size-10"
        >
          {busy ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <UploadCloud className="h-10 w-10 text-primary" />
          )}
          <span className="text-lg font-semibold text-card-foreground">
            {busy ? status || "جارٍ العمل…" : "اضغط لاختيار الملف"}
          </span>
          <span className="text-sm text-muted-foreground">
            <FileSpreadsheet className="ml-1 inline h-4 w-4" />
            تقرير أعمال بالعربية أو الإنجليزية
          </span>
        </Button>}
        {pending && <ExtractionReview fileName={pending.file.name} tables={pending.tables} selected={selected}
          onSelect={setSelected} onConfirm={confirmTable} onCancel={() => setPending(null)} busy={busy} />}
        {pending && busy && <p className="mt-3 text-sm text-primary" role="status">{status}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={SUPPORTED_FILE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />

        <p className="mt-4 text-center text-xs text-muted-foreground">
          يُحلَّل الملف داخل متصفحك، ثم تُحفظ النتيجة في حسابك فقط.
        </p>
      </main>
    </div>
  );
}
