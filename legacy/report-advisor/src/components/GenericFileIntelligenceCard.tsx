import { Activity, AlertTriangle, ClipboardCheck, FileSearch, Layers3, ListChecks, ShieldCheck, Sigma } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { BusinessFinding, ReportIntelligence } from '@/lib/report-intelligence/report-smart-insights';

function healthLabel(value: ReportIntelligence['advisorBrief']['health']): string {
  if (value === 'REVIEW_REQUIRED') return 'مراجعة مطلوبة';
  if (value === 'ATTENTION') return 'انتباه';
  return 'مستقر';
}

function severityLabel(value: string): string {
  const labels: Record<string, string> = { critical: 'حرج', high: 'مرتفع', medium: 'متوسط', low: 'منخفض', info: 'معلومة' };
  return labels[value] ?? value;
}

function EvidenceList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-xs text-ink-400">لا يتوفر دليل نصي إضافي لهذا البند.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={item + ':' + index} className="break-words rounded-lg border border-ink-100 bg-white px-3 py-2 text-xs leading-5 text-ink-700">
          <span className="ml-1 font-black text-primary-700">دليل {index + 1}:</span>{item}
        </li>
      ))}
    </ul>
  );
}

function FindingList({ id, title, items }: { id: string; title: string; items: BusinessFinding[] }) {
  return (
    <section id={id} data-testid={id} className="scroll-mt-5 space-y-3" aria-label={title}>
      <h3 className="flex items-center gap-2 text-sm font-black text-ink-950"><Layers3 size={16}/>{title} <span className="text-xs font-bold text-ink-400">({items.length})</span></h3>
      {items.length ? items.map((finding) => (
        <article key={finding.id} className="rounded-xl border border-ink-200/80 bg-white p-4 shadow-[0_10px_28px_-25px_rgba(15,23,42,.55)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4 className="text-sm font-black leading-6 text-ink-950">{finding.title}</h4>
            <Badge variant={finding.priority === 'high' ? 'warning' : 'neutral'}>{finding.priority === 'high' ? 'أولوية مرتفعة' : finding.priority === 'medium' ? 'أولوية متوسطة' : 'أولوية منخفضة'}</Badge>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-ink-700">{finding.statement}</p>
          {(finding.value != null || finding.dimensionValue || finding.dimensionLabel) && (
            <dl className="mt-3 grid gap-2 sm:grid-cols-3">
              {finding.value != null && <div className="rounded-lg bg-ink-50 p-2"><dt className="text-[10px] text-ink-500">القيمة المرصودة</dt><dd className="mt-1 break-words text-xs font-black text-ink-900">{String(finding.value)} {finding.unit ?? ''}</dd></div>}
              {finding.dimensionLabel && <div className="rounded-lg bg-ink-50 p-2"><dt className="text-[10px] text-ink-500">البُعد</dt><dd className="mt-1 break-words text-xs font-black text-ink-900">{finding.dimensionLabel}</dd></div>}
              {finding.dimensionValue && <div className="rounded-lg bg-ink-50 p-2"><dt className="text-[10px] text-ink-500">القيمة المرتبطة</dt><dd className="mt-1 break-words text-xs font-black text-ink-900">{finding.dimensionValue}</dd></div>}
            </dl>
          )}
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div><div className="mb-1 text-[10px] font-black text-ink-500">حدود الاستنتاج</div><p className="text-xs leading-5 text-ink-600">{finding.limitation}</p></div>
            <div><div className="mb-1 text-[10px] font-black text-ink-500">إجراء للمراجعة</div><p className="text-xs leading-5 text-ink-700">{finding.action}</p></div>
          </div>
          <div className="mt-3"><div className="mb-2 text-[10px] font-black text-ink-500">الأدلة</div><EvidenceList items={finding.evidence ?? []}/></div>
        </article>
      )) : (
        <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/70 p-4 text-xs leading-6 text-ink-600" data-testid={id + '-empty'}>
          لم تُشتق نتائج من هذا النوع من المحتوى المتاح. هذه حالة نتائج فارغة وليست دليلًا على خلو المصدر من المخاطر.
        </p>
      )}
    </section>
  );
}

function SourceLineage({ sourcePath, sourceHash, reportJobId }: { sourcePath?: string | null; sourceHash?: string | null; reportJobId?: string | null }) {
  if (!sourcePath && !sourceHash && !reportJobId) return null;
  return (
    <section className="mb-5 rounded-xl border border-primary-100 bg-primary-50/40 p-3" data-testid="generic-intelligence-source-lineage">
      <div className="mb-2 flex items-center gap-2 text-xs font-black text-primary-900"><ShieldCheck size={14}/> هوية المصدر المرتبط بهذه النتائج</div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {sourcePath && <div className="min-w-0"><dt className="text-[10px] text-ink-500">الملف</dt><dd className="mt-1 break-words text-xs font-bold text-ink-900">{sourcePath}</dd></div>}
        {reportJobId && <div className="min-w-0"><dt className="text-[10px] text-ink-500">معرّف التقرير</dt><dd className="mt-1 break-all font-mono text-[10px] text-ink-800">{reportJobId}</dd></div>}
        {sourceHash && <div className="min-w-0 sm:col-span-2"><dt className="text-[10px] text-ink-500">بصمة SHA-256</dt><dd className="mt-1 break-all font-mono text-[10px] leading-5 text-ink-800">{sourceHash}</dd></div>}
      </dl>
    </section>
  );
}

function scopeLabel(scope: string): string {
  const labels: Record<string, string> = {
    FULL_SOURCE: 'المصدر الكانوني كامل',
    PARTIAL_FETCH_CEILING: 'تحليل جزئي: تم بلوغ حد القراءة',
    PARTIAL_FETCH_ERROR: 'تحليل جزئي: تعذر قراءة جزء من الصفوف',
    PARTIAL_FETCH_INCOMPLETE: 'تغطية الصفوف الكانونية غير مكتملة',
  };
  return labels[scope] ?? 'نطاق القراءة يحتاج مراجعة';
}

export function GenericFileIntelligenceCard({
  intelligence,
  format,
  sourcePath,
  sourceHash,
  reportJobId,
  analysisScope,
  analysisSource,
}: {
  intelligence: ReportIntelligence | null;
  format: string;
  sourcePath?: string | null;
  sourceHash?: string | null;
  reportJobId?: string | null;
  analysisScope?: string | null;
  analysisSource?: 'canonical' | 'source-analysis-snapshot' | null;
}) {
  if (!intelligence) {
    return (
      <Card className="border-amber-200 bg-white" data-testid="generic-file-intelligence">
        <CardHeader
          title="التحليل العام للمصدر"
          subtitle="لم تتوفر مجموعة صفوف كاملة ومطابقة يمكن اشتقاق التحليل العام منها بأمان."
          action={<Badge variant="warning">التحليل غير متاح</Badge>}
        />
        <CardBody>
          <SourceLineage sourcePath={sourcePath} sourceHash={sourceHash} reportJobId={reportJobId}/>
          <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4" data-testid="generic-intelligence-unavailable">
            <h3 className="text-sm font-black text-amber-950">لم تكتمل مادة المصدر اللازمة للتحليل العام</h3>
            <p className="mt-2 text-xs leading-6 text-amber-950">لا أعرض التحليل المتخصص على أنه تحليل عام، ولا أستبدل الصفوف المفقودة بأرقام تقديرية. أعد محاولة استخراج هذا الملف أو استعادة صفوف المصدر، ثم أعد فتح التقرير للتحقق من ظهور الإشارات والتوصيات والأدلة.</p>
            {analysisScope && analysisScope !== 'FULL_SOURCE' && <p className="mt-2 text-xs font-bold text-amber-900">حالة تغطية المصدر: {scopeLabel(analysisScope)}.</p>}
          </section>
        </CardBody>
      </Card>
    );
  }

  const brief = intelligence.advisorBrief;
  const signals = intelligence.signals ?? [];
  const recommendations = intelligence.recommendations ?? [];
  const findingGroups = [
    { id: 'generic-intelligence-findings', label: 'الحقائق والنتائج', title: 'الحقائق والنتائج المستخرجة', items: intelligence.findings ?? [] },
    { id: 'generic-intelligence-risks', label: 'المخاطر', title: 'المخاطر المرصودة', items: intelligence.risks ?? [] },
    { id: 'generic-intelligence-opportunities', label: 'الفرص', title: 'الفرص المرصودة', items: intelligence.opportunities ?? [] },
  ];
  const inspections = intelligence.guidance.inspect ?? [];
  const resultsNavigation = [
    { id: 'generic-intelligence-signals', label: 'الإشارات', count: signals.length },
    { id: 'generic-intelligence-recommendations', label: 'التوصيات', count: recommendations.length },
    ...findingGroups.map(({ id, label, items }) => ({ id, label, count: items.length })),
    { id: 'generic-intelligence-inspect', label: 'فحوص إضافية', count: inspections.length },
  ];
  const evidenceCount = signals.reduce((sum, item) => sum + (item.evidence?.length ?? 0), 0)
    + recommendations.reduce((sum, item) => sum + (item.evidence?.length ?? 0), 0)
    + findingGroups.reduce((sum, group) => sum + group.items.reduce((groupSum, item) => groupSum + (item.evidence?.length ?? 0), 0), 0);

  return (
    <Card className="border-ink-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] shadow-[0_18px_52px_-42px_rgba(15,23,42,.55)] ring-1 ring-indigo-950/[.025]" data-testid="generic-file-intelligence">
      <CardHeader
        title="التحليل العام للمصدر"
        subtitle="طبقة مشتركة لكل الملفات: تستخرج الحقائق والإشارات من المحتوى نفسه، وتحتفظ بالأدلة والحدود حتى عند توفر تحليل متخصص."
        action={<Badge variant={brief.health === 'REVIEW_REQUIRED' ? 'warning' : brief.health === 'ATTENTION' ? 'warning' : 'neutral'}>{healthLabel(brief.health)}</Badge>}
      />
      <CardBody>
        <SourceLineage sourcePath={sourcePath} sourceHash={sourceHash} reportJobId={reportJobId}/>
        <nav className="mb-5 rounded-2xl border border-slate-700/80 bg-[linear-gradient(135deg,#0b1020_0%,#111827_58%,#1b1640_100%)] p-3 shadow-[0_20px_48px_-34px_rgba(15,23,42,.8)]" aria-label="التنقل في نتائج التحليل العام" data-testid="generic-intelligence-results-navigation">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div className="text-xs font-black text-white">استكشف النتائج المستخرجة</div>
            <div className="text-[10px] font-bold text-slate-400">كل مجموعة مرتبطة بنتيجة المصدر نفسه</div>
          </div>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
            {resultsNavigation.map((item) => (
              <a
                key={item.id}
                href={'#' + item.id}
                aria-label={'انتقل إلى ' + item.label + ' (' + item.count + ')'}
                className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-100 transition-colors hover:border-amber-300/70 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span className="leading-5">{item.label}</span>
                <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[11px] font-black tabular-nums text-amber-300">{item.count}</span>
              </a>
            ))}
          </div>
        </nav>
        {(analysisSource === 'source-analysis-snapshot' || (analysisScope && analysisScope !== 'FULL_SOURCE')) && (
          <section className="mb-5 rounded-xl border border-amber-200 bg-amber-50/70 p-3" data-testid="generic-intelligence-analysis-scope">
            <div className="text-xs font-black text-amber-950">حدود القراءة والإثبات</div>
            {analysisSource === 'source-analysis-snapshot'
              ? <p className="mt-1 text-xs leading-6 text-amber-950">اشتُق التحليل العام من لقطة الاستخراج المرتبطة بهوية هذا المصدر لأن الصفوف الكانونية غير متاحة. النتائج وصفية، وتبقى تغطية الإثبات الكانوني قيد المراجعة قبل أي قرار.</p>
              : <p className="mt-1 text-xs leading-6 text-amber-950">نطاق التحليل: {scopeLabel(analysisScope || 'UNKNOWN')}. الإشارات والأعداد هنا تخص الصفوف التي أمكن قراءتها فقط؛ لا تعممها على الصفوف غير المقروءة.</p>}
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-2xl border border-slate-700/80 bg-[linear-gradient(145deg,#0b1020_0%,#111827_60%,#1b1640_100%)] p-4 text-white shadow-[0_24px_56px_-38px_rgba(15,23,42,.8)]">
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[.08em] text-indigo-300"><FileSearch size={14}/> قراءة محايدة للمصدر</div>
            <h3 className="mt-2 text-base font-black leading-7 text-white">{brief.headline}</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{intelligence.summary}</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-100"><Activity size={14} className="text-indigo-300"/> سؤال التحليل</div>
              <p className="mt-1 text-xs leading-5 text-slate-300">{intelligence.businessQuestion}</p>
            </div>
          </section>
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['الإشارات', signals.length],
                ['التوصيات', recommendations.length],
                ['النتائج', (intelligence.findings ?? []).length],
                ['عناصر الدليل', evidenceCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-ink-200/80 bg-[linear-gradient(160deg,#ffffff_0%,#f8faff_100%)] p-3 shadow-[0_8px_20px_-19px_rgba(15,23,42,.45)]"><div className="text-[10px] text-ink-500">{label}</div><div className="mt-1 text-lg font-black text-ink-950">{value}</div></div>
              ))}
            </div>
            <div className="rounded-xl border border-primary-100 bg-primary-50/70 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-primary-900"><ListChecks size={15}/> الإجراء المقترح للمراجعة</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-primary-950">{brief.recommendedAction ?? 'لا توجد توصية كافية من المحتوى الحالي.'}</p>
              {brief.ownerHint && <p className="mt-2 text-xs leading-5 text-primary-900"><b>المالك المبدئي:</b> {brief.ownerHint}</p>}
              {brief.expectedOutcome && <p className="mt-2 text-xs leading-5 text-primary-900"><b>النتيجة المتوقعة غير المعتمدة:</b> {brief.expectedOutcome}</p>}
              {brief.measurement && <p className="mt-2 text-xs leading-5 text-primary-900"><b>القياس المقترح:</b> {brief.measurement}</p>}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-5 text-amber-950">
              <div className="flex items-center gap-2 font-black"><AlertTriangle size={14}/> حد الإثبات</div>
              <div className="mt-1 whitespace-pre-wrap">{brief.proofRequirement}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-ink-200/80 bg-[linear-gradient(160deg,#ffffff_0%,#f8faff_100%)] p-3 shadow-[0_8px_20px_-19px_rgba(15,23,42,.45)]"><div className="text-ink-500">الصيغة</div><div className="mt-1 break-words font-black text-ink-900">{format}</div></div>
              <div className="rounded-xl border border-ink-200/80 bg-[linear-gradient(160deg,#ffffff_0%,#f8faff_100%)] p-3 shadow-[0_8px_20px_-19px_rgba(15,23,42,.45)]"><div className="text-ink-500">الحالة</div><div className="mt-1 font-black text-ink-900">{healthLabel(brief.health)}</div></div>
            </div>
          </section>
        </div>

        <section id="generic-intelligence-signals" data-testid="generic-intelligence-signals" className="mt-6 scroll-mt-5 space-y-3" aria-label="كل إشارات التحليل العام">
          <h3 className="flex items-center gap-2 text-sm font-black text-ink-950"><Activity size={16}/> كل الإشارات ({signals.length})</h3>
          {signals.length ? signals.map((signal) => (
            <article key={signal.id} className="rounded-xl border border-ink-200/80 bg-white p-4 shadow-[0_10px_28px_-25px_rgba(15,23,42,.55)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-black leading-6 text-ink-950">{signal.title}</h4>
                <div className="flex flex-wrap gap-2"><Badge variant={signal.severity === 'critical' || signal.severity === 'high' ? 'warning' : 'neutral'}>{severityLabel(signal.severity)}</Badge><Badge variant="neutral">{signal.priority}</Badge></div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-ink-700">{signal.message}</p>
              {signal.affectedRows != null && <p className="mt-2 text-xs text-ink-500">عدد الصفوف المتأثرة المرصودة: {signal.affectedRows}</p>}
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {signal.soWhat && <div className="rounded-lg bg-ink-50 p-3"><div className="text-[10px] font-black text-ink-500">لماذا تهم؟</div><p className="mt-1 text-xs leading-5 text-ink-700">{signal.soWhat}</p></div>}
                {signal.impact && <div className="rounded-lg bg-ink-50 p-3"><div className="text-[10px] font-black text-ink-500">الأثر المثبت/حدوده</div><p className="mt-1 text-xs leading-5 text-ink-700">{signal.impact}</p></div>}
                {signal.ownerHint && <div className="rounded-lg bg-ink-50 p-3"><div className="text-[10px] font-black text-ink-500">المالك المقترح</div><p className="mt-1 text-xs leading-5 text-ink-700">{signal.ownerHint}</p></div>}
              </div>
              {signal.priorityReason && signal.priorityReason.length > 0 && <div className="mt-3"><div className="mb-1 text-[10px] font-black text-ink-500">سبب الأولوية كما حُسب</div><EvidenceList items={signal.priorityReason}/></div>}
              {signal.drivers?.length ? <div className="mt-3 space-y-2"><div className="text-[10px] font-black text-ink-500">محركات الإشارة</div>{signal.drivers.map((driver, index) => <div key={driver.dimension + ':' + driver.value + ':' + index} className="rounded-lg border border-ink-100 bg-ink-50/50 p-3"><p className="text-xs font-black text-ink-800">{driver.dimension}: {driver.value}</p><p className="mt-1 text-xs leading-5 text-ink-700">{driver.why}</p><EvidenceList items={driver.proof}/></div>)}</div> : null}
              <div className="mt-3"><div className="mb-1 text-[10px] font-black text-ink-500">كل الأدلة المصدرية ({signal.evidence?.length ?? 0})</div><EvidenceList items={signal.evidence ?? []}/></div>
            </article>
          )) : <p className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-xs text-ink-500">لم يستخرج هذا المصدر إشارات تتجاوز حدود التحليل الحالي؛ لا يتم اختلاق استثناءات.</p>}
        </section>

        <section id="generic-intelligence-recommendations" data-testid="generic-intelligence-recommendations" className="mt-6 scroll-mt-5 space-y-3" aria-label="كل توصيات التحليل العام">
          <h3 className="flex items-center gap-2 text-sm font-black text-ink-950"><ClipboardCheck size={16}/> كل التوصيات ({recommendations.length})</h3>
          {recommendations.length ? recommendations.map((recommendation) => (
            <article key={recommendation.id} className="rounded-xl border border-primary-100 bg-[linear-gradient(145deg,rgba(238,242,255,.8),rgba(255,255,255,.94))] p-4 shadow-[0_12px_32px_-28px_rgba(67,56,202,.45)] transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-black leading-6 text-ink-950">{recommendation.title}</h4>
                <Badge variant="neutral">{recommendation.status} · {recommendation.priority}</Badge>
              </div>
              <p className="mt-2 text-xs leading-6 text-ink-700">{recommendation.action}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  ['لماذا؟', recommendation.why],
                  ['لماذا الآن؟', recommendation.whyNow],
                  ['المالك', recommendation.ownerHint],
                  ['النتيجة المتوقعة', recommendation.expectedOutcome],
                  ['القياس', recommendation.measurement],
                  ['الأثر', recommendation.impact],
                  ['المخاطر', recommendation.risk],
                  ['العائق', recommendation.blocker],
                  ['حدود التوصية', recommendation.limitation],
                  ['الموعد المقترح', recommendation.deadlineHint],
                ].filter(([, value]) => value != null && String(value).trim()).map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-ink-100 bg-white p-3"><div className="text-[10px] font-black text-ink-500">{label}</div><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-ink-700">{value}</p></div>
                ))}
              </div>
              <div className="mt-3"><div className="mb-1 text-[10px] font-black text-ink-500">كل أدلة التوصية ({recommendation.evidence?.length ?? 0})</div><EvidenceList items={recommendation.evidence ?? []}/></div>
            </article>
          )) : <p className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-xs text-ink-500">لا توجد توصية مستخرجة من المحتوى الحالي.</p>}
        </section>

        <div className="mt-6 space-y-6">
          {findingGroups.map((group) => <FindingList key={group.id} id={group.id} title={group.title} items={group.items}/>)}
        </div>

        <section id="generic-intelligence-inspect" data-testid="generic-intelligence-inspect" className="mt-6 scroll-mt-5 rounded-xl border border-ink-200/80 bg-white p-4 shadow-[0_10px_28px_-25px_rgba(15,23,42,.55)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">
          <h3 className="flex items-center gap-2 text-sm font-black text-ink-900"><Sigma size={15}/> كل عناصر الفحص ({inspections.length})</h3>
          {inspections.length ? (
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {inspections.map((item, index) => <li key={item + ':' + index} className="break-words rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs leading-5 text-ink-700">{item}</li>)}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-ink-200 bg-ink-50/70 p-3 text-xs leading-6 text-ink-600" data-testid="generic-intelligence-inspect-empty">
              لا توجد عناصر فحص إضافية مستخرجة من المحتوى المتاح. لم تُعامل البيانات غير المتاحة على أنها صفر.
            </p>
          )}
        </section>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-primary-100 bg-primary-50/40 p-3 text-xs leading-5 text-primary-950">
          <ShieldCheck size={14} className="mt-0.5 shrink-0"/>
          <div>الأرقام والإشارات والأدلة المعروضة هنا مشتقة من محتوى المصدر المتاح. لا تُعد التوصية قرارًا معتمدًا؛ النتائج المستقبلية والأثر المالي والسببية والمقارنات غير المثبتة تظل غير معتمدة. <span className="font-black">الإثبات المعروض: {evidenceCount} مرجع دليل ضمن الإشارات والتوصيات والنتائج.</span></div>
        </div>
      </CardBody>
    </Card>
  );
}
