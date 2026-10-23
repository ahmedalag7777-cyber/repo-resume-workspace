/**
 * Monthly matrix intelligence: reports shaped as one row per entity (customer,
 * product, supplier…) with one column per month. Produces merchant-facing
 * results — lost customers, money at risk, growth stars, concentration — with
 * row-level proof. Grand-total rows are excluded before any calculation.
 */
import { toNumber } from "./parse";
import { fmt } from "./stats";
import type { Insight, RawTable, Role } from "./types";

const MONTHS: [number, RegExp][] = [
  [1, /^(يناير|كانون الثاني|jan(uary)?)$/i],
  [2, /^(فبراير|شباط|feb(ruary)?)$/i],
  [3, /^(مارس|آذار|اذار|mar(ch)?)$/i],
  [4, /^(أبريل|ابريل|إبريل|نيسان|apr(il)?)$/i],
  [5, /^(مايو|أيار|ايار|may)$/i],
  [6, /^(يونيو|يونيه|حزيران|jun(e)?)$/i],
  [7, /^(يوليو|يوليه|تموز|jul(y)?)$/i],
  [8, /^(أغسطس|اغسطس|آب|اب|aug(ust)?)$/i],
  [9, /^(سبتمبر|أيلول|ايلول|sep(tember)?)$/i],
  [10, /^(أكتوبر|اكتوبر|تشرين الأول|oct(ober)?)$/i],
  [11, /^(نوفمبر|تشرين الثاني|nov(ember)?)$/i],
  [12, /^(ديسمبر|كانون الأول|dec(ember)?)$/i],
];
const TOTAL_RE = /(إجمالي|اجمالي|المجموع|مجموع|total|grand)/i;

export interface MerchantView {
  kind: string;
  entityLabel: string;
  kpis: { label: string; value: string; hint?: string; tone?: "good" | "bad" | "neutral" }[];
  lists: { title: string; tone: "good" | "bad" | "neutral"; note: string; rows: { name: string; value: string; note: string }[] }[];
}

export interface MatrixResult {
  merchant: MerchantView;
  insights: Insight[];
  series: { period: string; value: number }[];
  segments: { name: string; value: number; count: number }[];
  excludedTotalRows: number[];
}

function monthOf(h: string) {
  const s = h.trim().replace(/\s+/g, " ");
  for (const [m, re] of MONTHS) if (re.test(s)) return m;
  return null;
}

export function detectMatrix(t: RawTable) {
  const months = t.headers.map((h, i) => ({ i, h, m: monthOf(h) })).filter((x) => x.m !== null) as { i: number; h: string; m: number }[];
  if (months.length < 3) return null;
  months.sort((a, b) => a.m - b.m);
  const monthIdx = new Set(months.map((m) => m.i));
  // Entity = first mostly-text column with many distinct values.
  let entity = -1;
  for (let i = 0; i < t.headers.length && entity < 0; i++) {
    if (monthIdx.has(i)) continue;
    const vals = t.rows.map((r) => r[i]).filter((v) => v !== null && v !== "");
    const texty = vals.filter((v) => typeof v === "string" && /[\p{L}]/u.test(v)).length;
    if (vals.length && texty / vals.length > 0.8 && new Set(vals.map((v) => String(v))).size > vals.length * 0.5) entity = i;
  }
  if (entity < 0) return null;
  return { months, entity };
}

const pctS = (x: number) => `${fmt(x * 100, 1)}%`;

export function analyzeMatrix(t: RawTable, fileName: string): MatrixResult | null {
  const d = detectMatrix(t);
  if (!d) return null;
  const entityLabel = t.headers[d.entity]!;
  const isCustomer = /(عميل|زبون|زبائن|عملاء|customer|client)/i.test(entityLabel + fileName);
  const isSupplier = /(مورد|supplier|vendor)/i.test(entityLabel + fileName);
  const isProduct = /(صنف|منتج|مادة|item|product|sku)/i.test(entityLabel + fileName);
  const noun = isCustomer ? "عميل" : isSupplier ? "مورد" : isProduct ? "صنف" : "بند";
  const nounPl = isCustomer ? "العملاء" : isSupplier ? "الموردون" : isProduct ? "الأصناف" : "البنود";
  const owner: Role = isSupplier ? "purchasing" : isProduct ? "inventory" : "sales";

  type Ent = { name: string; row: number; vals: number[]; total: number; active: number; avg: number };
  const all: Ent[] = t.rows.map((r, k) => {
    const vals = d.months.map((m) => Math.max(0, toNumber(r[m.i] ?? null) ?? 0));
    const total = vals.reduce((a, b) => a + b, 0);
    const active = vals.filter((v) => v > 0).length;
    return { name: String(r[d.entity] ?? "").trim(), row: t.sourceRows[k] ?? k + 2, vals, total, active, avg: active ? total / active : 0 };
  }).filter((e) => e.name);

  const grand = all.reduce((a, e) => a + e.total, 0);
  const excluded: number[] = [];
  const ents = all.filter((e) => {
    if (TOTAL_RE.test(e.name) || e.total >= 0.45 * (grand - e.total) && all.length > 10) { excluded.push(e.row); return false; }
    return e.total > 0;
  });
  if (ents.length < 3) return null;

  const n = d.months.length;
  const L = n - 1;
  const mNames = d.months.map((m) => m.h);
  const total = ents.reduce((a, e) => a + e.total, 0);
  const monthTotals = mNames.map((_, j) => ents.reduce((a, e) => a + e.vals[j]!, 0));
  const activeBy = mNames.map((_, j) => ents.filter((e) => e.vals[j]! > 0).length);
  const last = monthTotals[L]!, prev = monthTotals[L - 1]!;
  const mom = prev ? (last - prev) / prev : 0;
  const bestJ = monthTotals.indexOf(Math.max(...monthTotals));

  const sorted = [...ents].sort((a, b) => b.total - a.total);
  const top10 = sorted.slice(0, 10);
  const top10Share = top10.reduce((a, e) => a + e.total, 0) / total;
  // ABC
  let cum = 0; const abc = { A: 0, B: 0, C: 0 };
  for (const e of sorted) { cum += e.total; const s = cum / total; if (s <= 0.8) abc.A++; else if (s <= 0.95) abc.B++; else abc.C++; }
  const top20n = Math.max(1, Math.round(ents.length * 0.2));
  const top20Share = sorted.slice(0, top20n).reduce((a, e) => a + e.total, 0) / total;

  // Lost: bought before, nothing in last 2 months.
  const lost = ents.filter((e) => e.vals[L] === 0 && e.vals[L - 1] === 0 && e.vals.slice(0, L - 1).some((v) => v > 0)).sort((a, b) => b.avg - a.avg);
  const lostMonthly = lost.reduce((a, e) => a + e.avg, 0);
  // At risk: active before, dropped in last month (0) or fell below 40% of own avg.
  const risk = ents.filter((e) => !lost.includes(e) && e.active >= 2 && e.vals[L - 1]! > 0 && e.vals[L]! < 0.4 * e.avg).sort((a, b) => (b.avg - b.vals[L]!) - (a.avg - a.vals[L]!));
  const riskGap = risk.reduce((a, e) => a + (e.avg - e.vals[L]!), 0);
  // Growth stars
  const stars = ents.filter((e) => e.active >= 2 && e.vals[L]! > 1.5 * e.avg && e.vals[L]! > 0).sort((a, b) => (b.vals[L]! - b.avg) - (a.vals[L]! - a.avg));
  // New this month
  const fresh = ents.filter((e) => e.vals[L]! > 0 && e.vals.slice(0, L).every((v) => v === 0)).sort((a, b) => b.vals[L]! - a.vals[L]!);
  // One-time
  const once = ents.filter((e) => e.active === 1 && !fresh.includes(e));
  const loyal = ents.filter((e) => e.active === n);

  const rows = (es: Ent[], f: (e: Ent) => [string, string]) => es.slice(0, 10).map((e) => { const [v, note] = f(e); return { name: e.name, value: v, note }; });
  const refs = (es: Ent[]) => es.slice(0, 20).map((e) => e.row);
  const ins: Insight[] = [];
  const mk = (p: Omit<Insight, "proof" | "confidence" | "expectedOutcome"> & { cols: string[]; rows: number[]; metrics: { label: string; value: string | number }[]; outcome?: string }): Insight => ({
    id: p.id, capability: p.capability, severity: p.severity, kind: p.kind, what: p.what, why: p.why, soWhat: p.soWhat, impact: p.impact, whatNext: p.whatNext, whatIf: p.whatIf, owner: p.owner,
    proof: { columns: p.cols, rowRefs: p.rows, metrics: p.metrics }, expectedOutcome: p.outcome ?? null, confidence: 0.9,
  });

  if (lost.length) ins.push(mk({
    id: "mx-lost", capability: "churn", severity: "critical", kind: "warning", owner,
    what: `${lost.length} ${noun} توقفوا تماماً عن الشراء في ${mNames[L - 1]} و${mNames[L]}، وكانوا يشترون بمعدل ${fmt(lostMonthly)} شهرياً.`,
    why: `كان لهم تعامل سابق ثم صفر في آخر شهرين. أكبرهم: ${lost.slice(0, 3).map((e) => e.name).join("، ")}.`,
    soWhat: `هذه إيرادات تضيع كل شهر = ${pctS(lostMonthly / (monthTotals.reduce((a, b) => a + b, 0) / n))} من متوسط مبيعاتك الشهرية.`,
    impact: `استرجاع نصفهم فقط يعيد نحو ${fmt(lostMonthly / 2)} شهرياً (${fmt(lostMonthly * 6)} سنوياً).`,
    whatNext: `اتصل اليوم بأكبر 10 ${noun} متوقفين واعرف السبب (سعر، توفر، خدمة، منافس) وقدّم عرض عودة.`,
    whatIf: "كل شهر تأخير يقلل احتمال العودة ويثبّتهم عند المنافس.",
    cols: [entityLabel, mNames[L - 1]!, mNames[L]!], rows: refs(lost), outcome: "استعادة جزء من الإيراد المفقود",
    metrics: [{ label: "عدد المتوقفين", value: lost.length }, { label: "الخسارة الشهرية", value: fmt(lostMonthly) }],
  }));
  if (risk.length) ins.push(mk({
    id: "mx-risk", capability: "churn_risk", severity: "warning", kind: "warning", owner,
    what: `${risk.length} ${noun} انخفضت مشترياتهم في ${mNames[L]} لأقل من 40% من معدلهم المعتاد — فجوة ${fmt(riskGap)}.`,
    why: "هذا أول مؤشر قبل التوقف الكامل.",
    soWhat: "التدخل الآن أرخص بكثير من استرجاع عميل متوقف.",
    impact: `إعادتهم لمعدلهم الطبيعي تضيف ${fmt(riskGap)} للشهر القادم.`,
    whatNext: `تواصل مع ${risk.slice(0, 5).map((e) => e.name).join("، ")} هذا الأسبوع.`,
    whatIf: "إذا استمر الانخفاض شهراً آخر سينضمون غالباً لقائمة المتوقفين.",
    cols: [entityLabel, mNames[L]!], rows: refs(risk), metrics: [{ label: "عملاء في خطر", value: risk.length }, { label: "الفجوة", value: fmt(riskGap) }],
  }));
  ins.push(mk({
    id: "mx-trend", capability: "trends", severity: mom < -0.1 ? "warning" : mom > 0.1 ? "opportunity" : "info", kind: mom < -0.1 ? "warning" : "advisory", owner: "management",
    what: `مبيعات ${mNames[L]} = ${fmt(last)} (${mom >= 0 ? "+" : ""}${pctS(mom)} مقارنة بـ${mNames[L - 1]}). أفضل شهر كان ${mNames[bestJ]} بـ${fmt(monthTotals[bestJ]!)}.`,
    why: `عدد ${noun} النشطين: ${activeBy[L]} في ${mNames[L]} مقابل ${activeBy[L - 1]} في ${mNames[L - 1]}.`,
    soWhat: activeBy[L]! < activeBy[L - 1]! ? "التغير مدفوع بنقص عدد المشترين وليس فقط حجم الطلب." : "قاعدة المشترين مستقرة أو تنمو.",
    impact: null, whatNext: "قارن هذا الشهر بنفس الشهر من العام الماضي وراجع العروض والتوفر.", whatIf: null,
    cols: mNames, rows: [], metrics: mNames.map((m, j) => ({ label: m, value: fmt(monthTotals[j]!) })),
  }));
  ins.push(mk({
    id: "mx-conc", capability: "concentration", severity: top10Share > 0.5 ? "warning" : "info", kind: top10Share > 0.5 ? "warning" : "advisory", owner: "management",
    what: `أكبر 10 ${noun} يمثلون ${pctS(top10Share)} من الإجمالي، وأكبر 20% (${top20n}) يمثلون ${pctS(top20Share)}.`,
    why: `تصنيف ABC: فئة A = ${abc.A}، B = ${abc.B}، C = ${abc.C}.`,
    soWhat: top10Share > 0.5 ? "خسارة عميل كبير واحد تهز النتائج — اعتماد عالٍ على قلة." : "التوزيع صحي نسبياً.",
    impact: `أكبر ${noun}: ${sorted[0]!.name} بـ${fmt(sorted[0]!.total)} (${pctS(sorted[0]!.total / total)}).`,
    whatNext: `خصص مسؤول علاقة لكل ${noun} من الفئة A (${abc.A}) بزيارة/اتصال شهري.`, whatIf: null,
    cols: [entityLabel], rows: refs(top10), metrics: [{ label: "حصة أكبر 10", value: pctS(top10Share) }, { label: "فئة A", value: abc.A }],
  }));
  if (stars.length) ins.push(mk({
    id: "mx-stars", capability: "growth", severity: "opportunity", kind: "opportunity", owner,
    what: `${stars.length} ${noun} ضاعفوا مشترياتهم في ${mNames[L]} (أكثر من 1.5× معدلهم).`,
    why: `أبرزهم: ${stars.slice(0, 3).map((e) => `${e.name} (${fmt(e.vals[L]!)} مقابل معدل ${fmt(e.avg)})`).join("، ")}.`,
    soWhat: "عملاء في حالة توسع — الوقت المناسب لعرض أصناف إضافية أو اتفاقية كميات.",
    impact: `زيادة فعلية ${fmt(stars.reduce((a, e) => a + e.vals[L]! - e.avg, 0))} فوق المعدل.`,
    whatNext: "اعرف سبب النمو وثبّته بعقد أو خصم كمية.", whatIf: null,
    cols: [entityLabel, mNames[L]!], rows: refs(stars), metrics: [{ label: "عملاء نامون", value: stars.length }],
  }));
  if (once.length) ins.push(mk({
    id: "mx-once", capability: "retention", severity: "opportunity", kind: "opportunity", owner,
    what: `${once.length} ${noun} اشتروا مرة واحدة فقط ولم يعودوا (${pctS(once.length / ents.length)} من القاعدة).`,
    why: "التجربة الأولى لم تتحول إلى علاقة متكررة.",
    soWhat: "تحويل جزء منهم لعملاء متكررين أسهل من جذب عملاء جدد.",
    impact: `لو عاد 20% منهم بمتوسط شرائهم الأول: ~${fmt(once.reduce((a, e) => a + e.total, 0) * 0.2)}.`,
    whatNext: "حملة متابعة بعرض الطلب الثاني.", whatIf: null,
    cols: [entityLabel], rows: refs(once), metrics: [{ label: "مرة واحدة", value: once.length }],
  }));

  const merchant: MerchantView = {
    kind: isCustomer ? "مشتريات العملاء الشهرية" : isSupplier ? "مشتريات الموردين الشهرية" : isProduct ? "حركة الأصناف الشهرية" : "تقرير شهري",
    entityLabel,
    kpis: [
      { label: "إجمالي الفترة", value: fmt(total), hint: `${mNames[0]} – ${mNames[L]}` },
      { label: `مبيعات ${mNames[L]}`, value: fmt(last), hint: `${mom >= 0 ? "+" : ""}${pctS(mom)} عن الشهر السابق`, tone: mom >= 0 ? "good" : "bad" },
      { label: `${nounPl} النشطون الآن`, value: `${activeBy[L]} / ${ents.length}`, hint: `دائمون كل الأشهر: ${loyal.length}` },
      { label: "إيراد شهري مفقود", value: fmt(lostMonthly), hint: `${lost.length} ${noun} متوقف`, tone: lost.length ? "bad" : "good" },
      { label: "حصة أكبر 10", value: pctS(top10Share), hint: `فئة A: ${abc.A} ${noun}`, tone: top10Share > 0.5 ? "bad" : "neutral" },
      { label: `${nounPl} الجدد`, value: String(fresh.length), hint: `في ${mNames[L]}`, tone: "good" },
    ],
    lists: [
      { title: `اتصل بهم اليوم — ${nounPl} المتوقفون`, tone: "bad" as const, note: "مرتبون حسب قيمة الشراء الشهرية المفقودة", rows: rows(lost, (e) => [fmt(e.avg) + " /شهر", `آخر شراء: ${mNames[Math.max(...e.vals.map((v, j) => (v > 0 ? j : -1)))]}`]) },
      { title: "في خطر — انخفاض حاد", tone: "bad" as const, note: `مشتريات ${mNames[L]} مقابل معدلهم`, rows: rows(risk, (e) => [fmt(e.vals[L]!), `معدله ${fmt(e.avg)}`]) },
      { title: `أكبر ${nounPl} (فئة A)`, tone: "neutral" as const, note: "الحصة من إجمالي الفترة", rows: rows(top10, (e) => [fmt(e.total), pctS(e.total / total)]) },
      { title: "نجوم النمو", tone: "good" as const, note: `${mNames[L]} مقابل المعدل`, rows: rows(stars, (e) => [fmt(e.vals[L]!), `معدله ${fmt(e.avg)}`]) },
      { title: `${nounPl} الجدد هذا الشهر`, tone: "good" as const, note: "أول عملية شراء", rows: rows(fresh, (e) => [fmt(e.vals[L]!), "عميل جديد"]) },
    ].filter((l) => l.rows.length),
  };

  return {
    merchant, insights: ins, excludedTotalRows: excluded,
    series: mNames.map((m, j) => ({ period: m, value: monthTotals[j]! })),
    segments: top10.map((e) => ({ name: e.name, value: e.total, count: e.active })),
  };
}
