import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { MerchantView } from "@/lib/universal/matrix";

const toneText = { good: "text-success", bad: "text-destructive", neutral: "text-muted-foreground" } as const;
const toneBar = { good: "bg-success", bad: "bg-destructive", neutral: "bg-primary" } as const;

export function MerchantPanel({ m }: { m: MerchantView }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">لوحة التاجر — {m.kind}</h2>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">نتائج من صفوف ملفك</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {m.kpis.map((k) => {
          const Icon = k.tone === "good" ? TrendingUp : k.tone === "bad" ? TrendingDown : Minus;
          return (
            <div key={k.label} className="lift rounded-2xl border border-border bg-card p-5 shadow-card">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">{k.value}</p>
              {k.hint && (
                <p className={`mt-1 flex items-center gap-1 text-xs ${toneText[k.tone ?? "neutral"]}`}>
                  <Icon className="h-3.5 w-3.5" /> {k.hint}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {m.lists.map((l) => (
          <div key={l.title} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <span className={`h-2.5 w-2.5 rounded-full ${toneBar[l.tone]}`} />
              <h3 className="font-semibold text-foreground">{l.title}</h3>
              <span className="mr-auto text-xs text-muted-foreground">{l.note}</span>
            </div>
            <ul className="divide-y divide-border">
              {l.rows.map((r, i) => (
                <li key={r.name + i} className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-secondary/50">
                  <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate text-foreground">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.note}</span>
                  <span className="w-28 text-left font-semibold tabular-nums text-foreground">{r.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
