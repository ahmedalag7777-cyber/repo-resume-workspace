import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RawTable } from "@/lib/universal/types";

export function ExtractionReview({ fileName, tables, selected, onSelect, onConfirm, onCancel, busy }: {
  fileName: string; tables: RawTable[]; selected: number; onSelect: (index: number) => void;
  onConfirm: () => void; onCancel: () => void; busy: boolean;
}) {
  const table = tables[selected];
  if (!table) return null;
  return <section className="mt-8 space-y-5" aria-label="مراجعة القراءة">
    <h2 className="break-words text-lg font-semibold text-foreground">{fileName}</h2>
    <label className="block text-sm text-foreground">الجدول المختار
      <select value={selected} onChange={(e) => onSelect(Number(e.target.value))} disabled={busy}
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground">
        {tables.map((t, i) => <option key={i} value={i}>{t.sheet ?? `جدول ${i + 1}`} — {t.rows.length} صف × {t.headers.length} عمود</option>)}
      </select>
    </label>
    {table.extraction && <div className="border-s-2 border-primary ps-4 text-sm text-muted-foreground" role="note">
      <p className="flex items-center gap-2 font-medium text-foreground"><AlertTriangle className="size-4 shrink-0 text-primary" />القراءة تحتاج مراجعتك</p>
      {table.extraction.confidence !== undefined && <p className="mt-2">ثقة قارئ الصورة: {Math.round(table.extraction.confidence)}% — ليست ضماناً لصحة الحسابات</p>}
      {table.extraction.warnings.map((w, i) => <p key={i} className="mt-2">{w}</p>)}
    </div>}
    <p className="text-sm text-muted-foreground">{table.rows.length} صف • بداية الترويسة: {table.headerRow}</p>
    <div className="max-h-80 overflow-auto rounded-md border border-border">
      <table className="w-full text-sm"><thead className="bg-muted text-foreground"><tr>
        <th className="px-3 py-2 text-start">السطر</th>
        {table.headers.map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-2 text-start">{h}</th>)}
      </tr></thead><tbody>{table.rows.slice(0, 8).map((row, i) => <tr key={i} className="border-t border-border">
        <td className="px-3 py-2 text-muted-foreground">{table.sourceRows[i]}</td>
        {row.map((cell, j) => <td key={j} className="whitespace-nowrap px-3 py-2 text-foreground">{String(cell ?? "—")}</td>)}
      </tr>)}</tbody></table>
    </div>
    <div className="flex flex-wrap gap-3">
      <Button onClick={onConfirm} disabled={busy}><Check />اعتماد الجدول وتحليله</Button>
      <Button variant="outline" onClick={onCancel} disabled={busy}><X />إلغاء</Button>
    </div>
  </section>;
}