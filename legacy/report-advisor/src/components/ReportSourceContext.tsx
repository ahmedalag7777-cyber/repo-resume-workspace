import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleAlert, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSmartReport, fetchSmartReportCatalog, fetchSmartReportCatalogPage, type SmartReportCatalogItem, type SmartReportDetail } from '@/lib/report-smart';
import { formatNumber } from '@/lib/format';
import { useReportContext } from '@/components/ReportContext';
import { selectExecutiveRecommendation, selectExecutiveSignal } from '@/lib/report-intelligence/report-smart-insights';
import { IntelligenceResultRail } from '@/components/IntelligenceResultRail';
import { getReportArchetype } from '@/lib/report-intelligence/archetype-registry';

const DOMAIN_PATHS: Record<string, { path: string; label: string }> = {
  sales: { path: '/reports/sales', label: 'تقرير المبيعات' },
  purchases: { path: '/reports/purchases', label: 'تقرير المشتريات' },
  inventory: { path: '/reports/inventory', label: 'تقرير المخزون' },
  payments: { path: '/analytics/liquidity', label: 'تحليل المدفوعات والسيولة' },
  receivables: { path: '/reports/receivables', label: 'تقرير الذمم المدينة' },
  profitability: { path: '/reports/profitability', label: 'تقرير الربحية' },
};

const REPORT_CONTEXT_CACHE = new Map<string, SmartReportDetail>();
const SOURCE_CONTEXT_SHORTCUTS = [
  { path: '/intelligence', label: 'الذكاء' },
  { path: '/advisor-cases', label: 'قضية Advisor' },
  { path: '/work-center', label: 'العمل' },
  { path: '/replay', label: 'إعادة التتبع' },
  { path: '/benchmark', label: 'المقارنة' },
  { path: '/trust', label: 'الدليل' },
  { path: '/decision-experience?stage=evidence', label: 'القرار' },
] as const;

export function SourceContextNavigation({ jobId, sourceHash, variant = 'default' }: { jobId: string; sourceHash: string; variant?: 'default' | 'dark' }) {
  const contextQuery = 'reportJobId=' + encodeURIComponent(jobId) + '&sourceHash=' + encodeURIComponent(sourceHash);
  return (
    <nav aria-label="مسارات التقرير الحالي" data-testid="report-source-context-links" className="mt-3 flex flex-wrap gap-2">
      {SOURCE_CONTEXT_SHORTCUTS.map((item) => (
        <Link
          key={item.path}
          to={item.path + (item.path.includes('?') ? '&' : '?') + contextQuery}
          className={variant === 'dark'
            ? 'inline-flex min-h-9 items-center rounded-lg border border-white/15 bg-white/[.06] px-3 py-2 text-[10px] font-bold text-slate-100 transition hover:border-primary-300/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300'
            : 'btn-secondary text-[10px]'}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}


// These surfaces are part of the report-to-decision operating chain. Once a
// verified report is active, navigation to any of them must carry the exact
// reportJobId + sourceHash instead of silently falling back to global data.
const CONTEXT_CONTINUITY_PATHS = [
  '/command-center',
  '/decision-inbox',
  '/decision-experience',
  '/advisor-cases',
  '/trust',
  '/intelligence',
  '/work-center',
  '/operations',
  '/replay',
  '/benchmark',
  '/metrics',
  '/reports/executive',
  '/reports/sales',
  '/reports/purchases',
  '/reports/inventory',
  '/reports/inventory-intelligence',
  '/reports/demand-velocity',
  '/reports/receivables',
  '/reports/profitability',
  '/analytics',
  '/analytics/rfm',
  '/analytics/abc',
  '/analytics/aging',
  '/analytics/liquidity',
  '/data-quality',
] as const;

function needsContextContinuity(pathname: string): boolean {
  return CONTEXT_CONTINUITY_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
}

function requestSignal(controller: AbortController): AbortSignal {
  return AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]);
}

function stateLabel(value: string | null): string {
  if (!value) return 'غير متاح';
  const labels: Record<string, string> = {
    TRUSTED: 'موثوق',
    REVIEW: 'مراجعة',
    BLOCKED: 'محظور',
    VERIFIED: 'موثق',
    AWAITING_EVIDENCE_SNAPSHOT: 'بانتظار لقطة الدليل',
    INSUFFICIENT_SAMPLE: 'عينة غير كافية',
    NOT_AVAILABLE: 'غير متاح',
  };
  return labels[value] ?? value;
}

export function ReportSourceContext() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { reportJobId: storedJobId, sourceHash: storedSourceHash, setReportContext } = useReportContext();
  const urlJobId = params.get('reportJobId')?.trim() || '';
  const urlSourceHash = params.get('sourceHash')?.trim() || '';
  const urlValidSourceHash = /^sha256:[0-9a-fA-F]{64}$/.test(urlSourceHash);
  useEffect(() => {
    if (urlJobId && urlValidSourceHash) setReportContext(urlJobId, urlSourceHash);
  }, [urlJobId, urlSourceHash, urlValidSourceHash, setReportContext]);
  const jobId = urlValidSourceHash ? urlJobId : storedJobId;
  const sourceHash = urlValidSourceHash ? urlSourceHash : storedSourceHash;
  const validSourceHash = /^sha256:[0-9a-fA-F]{64}$/.test(sourceHash);
  const cacheKey = jobId && validSourceHash ? jobId + ':' + sourceHash : '';
  const [report, setReport] = useState<SmartReportDetail | null>(() => cacheKey ? REPORT_CONTEXT_CACHE.get(cacheKey) ?? null : null);
  const [error, setError] = useState<string | null>(null);
  const [contextResolving, setContextResolving] = useState(false);
  const [recentReports, setRecentReports] = useState<SmartReportCatalogItem[]>([]);
  const [recentReportsLoading, setRecentReportsLoading] = useState(false);

  useEffect(() => {
    if (!needsContextContinuity(location.pathname) || location.pathname === '/reports' || location.pathname.startsWith('/reports/smart/')) {
      setRecentReports([]);
      setRecentReportsLoading(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setRecentReportsLoading(true);
    void fetchSmartReportCatalogPage(6, 0, { signal: requestSignal(controller) })
      .then((page) => { if (active) setRecentReports(page.reports); })
      .catch((cause) => {
        if (active && !controller.signal.aborted) console.warn('[ReportSourceContext] recent smart report navigation unavailable', cause);
      })
      .finally(() => { if (active) setRecentReportsLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [location.pathname]);

  // Normalize the browser URL to the active report context. This closes the
  // exact failure mode where a global sidebar/journey link lands on a
  // source-bound surface without its lineage query parameters.
  useEffect(() => {
    if (contextResolving || !jobId || !validSourceHash || !needsContextContinuity(location.pathname)) return;
    const currentQuery = new URLSearchParams(location.search);
    const hasExactContext = currentQuery.get('reportJobId') === jobId && currentQuery.get('sourceHash') === sourceHash;
    if (hasExactContext) return;
    currentQuery.set('reportJobId', jobId);
    currentQuery.set('sourceHash', sourceHash);
    navigate(
      { pathname: location.pathname, search: '?' + currentQuery.toString() },
      { replace: true },
    );
  }, [contextResolving, jobId, location.pathname, location.search, navigate, sourceHash, validSourceHash]);

  useEffect(() => {
    if (!needsContextContinuity(location.pathname)) {
      setContextResolving(false);
      return;
    }
    if (urlJobId && urlValidSourceHash) return;
    if (storedJobId && validSourceHash) return;
    let active = true;
    const controller = new AbortController();
    setContextResolving(true);
    setError(null);
    void fetchSmartReportCatalog(1, { signal: requestSignal(controller) })
      .then((catalog) => {
        if (!active) return;
        const latest = catalog[0];
        if (latest?.jobId && latest.sourceHash) setReportContext(latest.jobId, latest.sourceHash);
        else setError('لا يوجد تقرير مكتمل صالح للربط بالسياق الحالي.');
      })
      .catch((cause) => { if (active && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (active) setContextResolving(false); });
    return () => { active = false; controller.abort(); };
  }, [location.pathname, urlJobId, urlValidSourceHash, storedJobId, validSourceHash, setReportContext]);

  useEffect(() => {
    if (!needsContextContinuity(location.pathname)) {
      setReport(null);
      setError(null);
      return;
    }
    if (contextResolving) return;
    if (!jobId || !validSourceHash) {
      setReport(null);
      setError(jobId ? 'مصدر التقرير يحتاج بصمة صالحة.' : null);
      return;
    }
    let active = true;
    const controller = new AbortController();
    const key = jobId + ':' + sourceHash;
    const cached = REPORT_CONTEXT_CACHE.get(key);
    if (cached) {
      setReport(cached);
      setError(null);
      return () => { active = false; controller.abort(); };
    }
    setReport(null);
    setError(null);
    void fetchSmartReport(jobId, sourceHash, { signal: requestSignal(controller) }).then((value) => {
      if (!active) return;
      if (value && sourceHash && value.sourceHash !== sourceHash) {
        setReport(null);
        setError('مصدر التقرير لا يطابق البصمة المرسلة إلى هذه الشاشة.');
        return;
      }
      if (!value) {
        setReport(null);
        setError('لم يتم العثور على التقرير المرتبط بالمصدر الحالي.');
        return;
      }
      REPORT_CONTEXT_CACHE.set(key, value);
      setError(null);
      setReport(value);
    }).catch((cause) => {
      if (active && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { active = false; controller.abort(); };
  }, [location.pathname, contextResolving, jobId, sourceHash, validSourceHash]);

  if (!needsContextContinuity(location.pathname)) return null;

  if (contextResolving && !report) {
    return (
      <section dir="rtl" className="mb-4 rounded-2xl border border-primary-200 bg-primary-50/70 p-4" role="status" aria-live="polite">
        <div className="text-[11px] font-black text-primary-950">جارٍ ربط أحدث تقرير ذكي بالسياق الحالي…</div>
        <p className="mt-1 text-[10px] leading-5 text-primary-900/80">لن نعرض أرقامًا أو توصيات عامة؛ سيتم تحميل النتيجة من آخر تقرير مكتمل في نفس مساحة العمل.</p>
        {jobId && validSourceHash ? <SourceContextNavigation jobId={jobId} sourceHash={sourceHash} /> : null}
      </section>
    );
  }

  if (!jobId || !validSourceHash) return null;

  if (!report && !error) {
    return (
      <section dir="rtl" className="mb-4 rounded-2xl border border-primary-200 bg-primary-50/70 p-4" role="status" aria-live="polite" data-testid="report-source-context-loading">
        <div className="text-[11px] font-black text-primary-950">جارٍ تحميل تفاصيل التقرير المرتبط بالمصدر…</div>
        <p className="mt-1 text-[10px] leading-5 text-primary-900/80">هوية التقرير وبصمته محفوظتان؛ تبقى تفاصيل التحليل قيد القراءة، ولا يتوقف التنقل بين مساحات التقرير أثناء ذلك.</p>
        <SourceContextNavigation jobId={jobId} sourceHash={sourceHash} />
      </section>
    );
  }

  if (error || !report) {
    return (
      <section dir="rtl" className="rounded-2xl border border-warning-200 bg-warning-50/80 p-4" role="status">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-warning-800" />
          <div className="min-w-0">
            <div className="text-[11px] font-black text-warning-950">سياق المصدر غير متاح</div>
            <p className="mt-1 text-[11px] leading-5 text-warning-900/80">{error === 'INVALID_REPORT_CONTEXT' ? 'تعذر تحديد سياق التقرير الحالي. افتح التقرير من مركز التقارير.' : error ?? 'تعذر قراءة التقرير المصدرّي الحالي.'}</p>
            <Link to="/reports" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[10px] font-black text-warning-950">العودة إلى مركز التقارير <ArrowLeft size={13}/></Link>
            <SourceContextNavigation jobId={jobId} sourceHash={sourceHash} />
          </div>
        </div>
      </section>
    );
  }

  if (location.pathname.startsWith('/reports/smart/')) return null;

  const domain = report?.specialty ? DOMAIN_PATHS[report.specialty] : null;
  const signal = selectExecutiveSignal(report.intelligence);
  const recommendation = selectExecutiveRecommendation(report.intelligence, signal);
  const evidence = signal?.evidence ?? recommendation?.evidence ?? [];
  const archetype = report.archetypeId ? getReportArchetype(report.archetypeId) : null;
  const lifecycle = [
    { key: 'truth', label: 'الحقيقة', value: report.trustState, ready: ['TRUSTED', 'VERIFIED'].includes(String(report.trustState)) },
    { key: 'evidence', label: 'الدليل', value: report.evidenceStatus, ready: ['VERIFIED', 'TRUSTED'].includes(String(report.evidenceStatus)) },
    { key: 'signal', label: 'الإشارة', value: signal ? 'SIGNAL' : 'NO_SIGNAL', ready: Boolean(signal) },
    { key: 'recommendation', label: 'التوصية', value: recommendation ? 'PROPOSED' : 'NO_RECOMMENDATION', ready: Boolean(recommendation) },
    { key: 'decision', label: 'القرار', value: report.decisionStatus, ready: ['APPROVED', 'COMMITTED', 'READY'].includes(String(report.decisionStatus)) },
    { key: 'action', label: 'العمل', value: report.actionStatus, ready: ['STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(String(report.actionStatus)) },
    { key: 'outcome', label: 'النتيجة', value: report.outcomeStatus, ready: ['VERIFIED', 'MEASURED', 'COMPLETED'].includes(String(report.outcomeStatus)) },
    { key: 'learning', label: 'التعلّم', value: report.learningStatus, ready: ['VERIFIED', 'COMPLETED', 'AVAILABLE'].includes(String(report.learningStatus)) },
  ];
  const lifecycleIndex = lifecycle.findIndex((item) => !item.ready);
  const nextLifecycle = lifecycleIndex >= 0 ? lifecycle[lifecycleIndex] : null;
  return (
    <div className="mb-4 space-y-3">
      {location.pathname !== '/reports' && !location.pathname.startsWith('/reports/smart/') ? (
        <section dir="rtl" className="rounded-2xl border border-ink-200 bg-white/95 px-4 py-3 shadow-sm" aria-label="التقارير الذكية الأخيرة" data-testid="recent-smart-report-navigation">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-black text-ink-950">التقارير الذكية الأخيرة</div>
              <p className="mt-0.5 text-[9px] text-ink-500">افتح أي تقرير من مصدره الأصلي؛ تبقى بصمة المصدر ومعرّف المهمة مرتبطين بالتنقل.</p>
            </div>
            <Link to="/reports" className="text-[10px] font-black text-primary-700 hover:text-primary-900">عرض كل التقارير ←</Link>
          </div>
          {recentReports.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {recentReports.map((item) => (
                <Link
                  key={item.jobId + ':' + item.sourceHash}
                  data-testid="recent-smart-report-link"
                  to={'/reports/smart/' + encodeURIComponent(item.jobId) + '?sourceHash=' + encodeURIComponent(item.sourceHash)}
                  className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2.5 transition hover:border-primary-300 hover:bg-primary-50/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-black text-ink-900" title={item.sourcePath}>{item.sourcePath || 'تقرير أعمال بدون اسم'}</span>
                    <span className="mt-1 block truncate text-[9px] text-ink-500">{item.specialty ? (DOMAIN_PATHS[item.specialty]?.label ?? 'تحليل أعمال') : 'تحليل أعمال ذكي'} · {item.rowCount == null ? 'عدد الصفوف غير متاح' : formatNumber(item.rowCount) + ' صف'}</span>
                  </span>
                  <span className="shrink-0 text-[9px] font-black text-primary-700 group-hover:translate-x-[-2px]">فتح ←</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[9px] text-ink-500">{recentReportsLoading ? 'جارٍ تحميل التقارير الأخيرة…' : 'لا توجد تقارير أخيرة متاحة للعرض على هذه الشاشة.'}</p>
          )}
        </section>
      ) : null}
      <section dir="rtl" className="rounded-[20px] border border-ink-200 bg-ink-950 p-3 text-white shadow-sm" aria-label="سلسلة ذكاء التقرير الحالية">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[9px] font-black tracking-[.13em] text-primary-200">
              <ShieldCheck size={13} /> العقل التشغيلي · نفس التقرير في كل المساحات
              {archetype ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 tracking-normal text-slate-200">{archetype.title}</span> : null}
            </div>
            <div className="mt-1 text-[10px] leading-5 text-slate-300">{nextLifecycle ? <>المنتج الآن يقود من <b className="text-white">{nextLifecycle.label}</b>؛ لا يتم القفز إلى المرحلة التالية دون إثبات.</> : <>السلسلة مكتملة الحالة الحالية؛ يبقى القياس والتعلّم محكومين بالدليل.</>}</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:flex lg:flex-nowrap">
            {lifecycle.map((item) => (
              <Link key={item.key} to={'/reports/smart/' + encodeURIComponent(report.jobId) + '?sourceHash=' + encodeURIComponent(report.sourceHash)} className={'inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-[8px] font-black transition ' + (item.ready ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/15' : item.key === nextLifecycle?.key ? 'border-amber-300/35 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/[.03] text-slate-400')} title={String(item.value ?? 'NOT_AVAILABLE')}>
                {item.ready ? <CheckCircle2 size={11} /> : item.key === nextLifecycle?.key ? <CircleAlert size={11} /> : null}{item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <IntelligenceResultRail
        sourceLabel={report.sourcePath || 'التقرير الحالي'}
        headline={signal?.message ?? report.intelligence.advisorBrief.headline ?? 'لا يوجد حكم استشاري مثبت من المصدر الحالي.'}
        signalTitle={signal?.title ?? 'لا توجد إشارة مؤهلة'}
        signalMessage={signal?.message ?? report.intelligence.summary ?? 'لا توجد نتيجة استثنائية مثبتة من المصدر الحالي.'}
        evidence={evidence}
        whyNow={recommendation?.whyNow ?? signal?.soWhat ?? 'لا توجد قرينة كافية لتحديد أولوية إضافية.'}
        recommendationTitle={recommendation?.title ?? 'مراجعة الدليل قبل إنشاء توصية'}
        recommendationAction={recommendation?.action ?? report.intelligence.advisorBrief.recommendedAction ?? 'لا يوجد إجراء تنفيذي مؤهل قبل اكتمال الدليل.'}
        measurement={recommendation?.measurement ?? report.intelligence.advisorBrief.measurement ?? 'لا توجد آلية قياس مثبتة بعد.'}
        blocker={recommendation?.blocker ?? report.intelligence.advisorBrief.proofRequirement ?? 'اعتماد الدليل النهائي غير مثبت.'}
        status={report.reportVerificationState === 'VERIFIED' ? 'الدليل موثق' : report.sourceTrustState === 'TRUSTED' ? 'الذكاء متاح · الاعتماد النهائي يحتاج مراجعة' : 'المراجعة مطلوبة'}
        href={'/reports/smart/' + encodeURIComponent(report.jobId) + '?sourceHash=' + encodeURIComponent(report.sourceHash)}
        hrefLabel="التقرير الذكي الكامل"
      />

      <section dir="rtl" className="report-context-compact rounded-2xl border border-primary-200/70 bg-white/90 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ink-950 px-2.5 py-1 text-[9px] font-black text-white">السياق الحالي</span>
            <span className="truncate text-sm font-black text-ink-950">{report.specialty ? (DOMAIN_PATHS[report.specialty]?.label ?? 'تحليل أعمال') : 'تحليل أعمال ذكي'}</span>
            <span className="text-[10px] text-ink-400">·</span>
            <span className="text-[10px] font-bold text-ink-600">{report.rowCount == null ? 'حجم المصدر غير متاح' : formatNumber(report.rowCount) + ' صفًا'}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-ink-500">
            <span>{report.rowCount == null ? 'عدد الصفوف غير متاح' : formatNumber(report.rowCount) + ' صف'}</span>
            <span>·</span>
            <span>الجودة {report.qualityScore == null ? 'غير متاح' : report.qualityScore + '%'}</span>
            <span>·</span>
            <span>الثقة {stateLabel(report.trustState)}</span>
            <span>·</span>
            <span>الدليل {stateLabel(report.evidenceStatus)}</span>
            <span>·</span>
            <span>المصدر الأصلي محفوظ للتدقيق</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={'/reports/smart/' + encodeURIComponent(report.jobId) + '?sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-primary text-[10px]">التقرير الذكي</Link>
          <Link to={'/command-center?reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">مركز القرار</Link>
          <Link to={'/decision-inbox?reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">صندوق القرارات</Link>
          <Link to={'/reports/executive?reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">التقرير التنفيذي</Link>
          <Link to={'/trust?reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">الدليل</Link>
          <Link to={'/decision-experience?stage=evidence&reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">القرار</Link>
          <Link to={'/intelligence?reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">الذكاء</Link>
          <Link to={'/advisor-cases?reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">قضية Advisor</Link>
          <Link to={'/work-center?reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">العمل</Link>
          <Link to={'/replay?reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">إعادة التتبع</Link>
          <Link to={'/benchmark?reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">المقارنة</Link>
          {domain ? <Link to={domain.path + '?reportJobId=' + encodeURIComponent(report.jobId) + '&sourceHash=' + encodeURIComponent(report.sourceHash)} className="btn-secondary text-[10px]">{domain.label}</Link> : null}
        </div>
      </div>
      </section>
    </div>
  );
}
