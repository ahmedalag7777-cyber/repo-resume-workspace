import { FileSearch, AlertTriangle } from "lucide-react";
import type { AnalysisResult } from "@/lib/universal/types";

const reasonLabel = { total: "إجمالي", blank: "فارغ", preamble: "قبل الترويسة" };

export function SourceAuditPanel({ result }: { result: AnalysisResult }) {
  const audit = result.audit;
  return <section aria-label="سجل المصدر والتحقق" className="mt-6 space-y-6">
    <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><FileSearch className="size-5 text-primary" />سجل المصدر والتحقق</h2>
    <p className="text-sm text-muted-foreground">{result.sheet ?? "الجدول الرئيسي"} • إصدار التحليل: {result.engineVersion}</p>
    {result.verification?.length ? <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm"><thead className="bg-muted text-muted-foreground"><tr>
        <th className="px-3 py-2 text-start">العمود</th><th className="px-3 py-2 text-start">المجموع المعاد حسابه</th><th className="px-3 py-2 text-start">المطابقة</th><th className="px-3 py-2 text-start">صفوف رقمية</th>
      </tr></thead><tbody>{result.verification.map((v) => <tr key={v.column} className="border-t border-border text-foreground">
        <td className="px-3 py-2">{v.column}</td><td className="px-3 py-2">{v.sourceTotal.toLocaleString("ar", { maximumFractionDigits: 8 })}</td>
        <td className="px-3 py-2">{v.matches ? "مطابق" : "اختلاف حسابي"}{v.invalidRows.length ? ` • ${v.invalidRows.length} قيمة غير صالحة` : ""}</td><td className="px-3 py-2">{v.numericRows}</td>
      </tr>)}</tbody></table>
    </div> : <p className="text-sm text-muted-foreground">لا أعمدة رقمية قابلة للتحقق في هذا التحليل.</p>}
    <p className="text-xs text-muted-foreground">المطابقة تثبت إعادة الجمع من الخلايا المقروءة، ولا تثبت صحة المستند أو العملة أو تفسير العمود.</p>
    {audit && <>
      <p className="text-sm text-foreground">{audit.inputRows} سطر قبل المعالجة • الترويسة {audit.headerRow} • {audit.excluded.length} سطر مستبعد</p>
      {!!audit.excluded.length && <details className="border-y border-border py-3"><summary className="cursor-pointer text-sm font-medium text-foreground">الصفوف المستبعدة وأسبابها ({audit.excluded.length})</summary>
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm text-muted-foreground">{audit.excluded.map((r) => <li key={r.row}>السطر {r.row} • {reasonLabel[r.reason]}{r.label ? ` • ${r.label}` : ""}</li>)}</ul>
      </details>}
      {!!audit.shapeIssues.length && <div className="border-s-2 border-primary ps-3 text-sm text-muted-foreground"><p className="flex items-center gap-2 text-foreground"><AlertTriangle className="size-4 text-primary" />اختلاف عرض الصفوف</p>
        {audit.shapeIssues.slice(0, 20).map((r) => <p key={r.row} className="mt-2">السطر {r.row}: {r.actual} خلية مقابل {r.expected} عمود{r.extraCells?.length ? ` • خلايا خارج الترويسة: ${r.extraCells.map((c) => String(c ?? "—")).join("، ")}` : ""}</p>)}
      </div>}
      {!!audit.formulas?.length && <details className="border-y border-border py-3"><summary className="cursor-pointer text-sm font-medium text-foreground">صيغ الملف ({audit.formulas.length})</summary>
        <p className="mt-3 text-sm text-muted-foreground">القيم مخزنة في الملف؛ لم يُعد حساب الصيغ.</p>
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm text-foreground">{audit.formulas.map((f) => <li key={f.address}><code dir="ltr">{f.address}: {f.expression}</code> • {f.cached ? "قيمة مخزنة" : "لا قيمة مخزنة"}</li>)}</ul>
      </details>}
    </>}
  </section>;
}