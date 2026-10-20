import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileSpreadsheet,
  ShieldCheck,
  Lightbulb,
  ListChecks,
  Compass,
  ArrowLeft,
  Brain,
  UploadCloud,
  Gauge,
} from "lucide-react";
import hero from "@/assets/hero-intel.jpg";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مستشار التقارير — حلّل أي تقرير أعمال في دقائق" },
      {
        name: "description",
        content:
          "ارفع ملف Excel أو CSV أو JSON واحصل على رؤى استشارية وتحذيرية وتوصيات ومهام يومية موزعة على فريقك — كل نتيجة مدعومة بدليل من بياناتك.",
      },
      { property: "og:title", content: "مستشار التقارير — حلّل أي تقرير أعمال في دقائق" },
      { property: "og:description", content: "رؤى وتوصيات ومهام يومية من أي ملف تقرير، بدليل من بياناتك نفسها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: FileSpreadsheet, title: "يفهم أي تقرير", text: "Excel وCSV وJSON، بالعربية أو الإنجليزية، حتى لو كان نوع التقرير مجهولاً تماماً." },
  { icon: Lightbulb, title: "رؤى بأسلوب الاستشاري", text: "ماذا حدث، لماذا، ماذا يعني، ما أثره، وما الخطوة التالية." },
  { icon: ShieldCheck, title: "كل رقم بدليل", text: "كل نتيجة مربوطة بأعمدة وأرقام صفوف من ملفك — لا اختراع ولا تخمين." },
  { icon: ListChecks, title: "مهام يومية لفريقك", text: "توزيع تلقائي حسب التخصص: مبيعات، مشتريات، مخزون، مالية، عمليات." },
  { icon: Compass, title: "قرارات موثقة", text: "اعتمد أو ارفض كل توصية بملاحظة، ويتعلم النظام من قراراتك." },
  { icon: Brain, title: "48 نموذج تقارير", text: "محرك ذكاء يتعرف على نوع التقرير ويطبق أفضل أسلوب تحليل له." },
];

const steps = [
  { icon: UploadCloud, title: "ارفع الملف", text: "اسحب تقريرك وأفلته" },
  { icon: Gauge, title: "تحليل فوري", text: "جودة البيانات والقدرات المتاحة" },
  { icon: ListChecks, title: "قرارات ومهام", text: "توصيات جاهزة للتنفيذ" },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <img src={hero} alt="" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          <div className="relative mx-auto max-w-6xl px-4 py-24 text-center md:py-32">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> محرك ذكاء التقارير — نسخة موحّدة
            </span>
            <h1 className="animate-fade-up mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight text-foreground md:text-6xl" style={{ animationDelay: "80ms" }}>
              ارفع تقريرك… واستلم <span className="text-gradient-gold">تحليلاً استشارياً</span> كاملاً
            </h1>
            <p className="animate-fade-up mx-auto mt-5 max-w-2xl text-lg text-muted-foreground" style={{ animationDelay: "160ms" }}>
              أي ملف — مبيعات، مخزون، مالية أو غيرها — يتحول إلى رؤى وتحذيرات وتوصيات ومهام يومية، وكل رقم مدعوم بدليل من صفوف ملفك.
            </p>
            <div className="animate-fade-up mt-9 flex flex-wrap justify-center gap-3" style={{ animationDelay: "240ms" }}>
              <Link to="/analyze" className="bg-gradient-gold inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]">
                ابدأ التحليل الآن <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link to="/auth" className="glass inline-flex items-center rounded-xl border border-border px-7 py-3.5 text-base font-medium text-foreground hover:bg-secondary">
                إنشاء حساب مجاني
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="glass flex items-center gap-4 rounded-2xl border border-border p-5 shadow-card">
                <span className="font-display text-3xl font-bold text-gradient-gold">0{i + 1}</span>
                <s.icon className="h-6 w-6 text-info" />
                <div>
                  <p className="font-semibold text-foreground">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-grid mx-auto max-w-6xl px-4 pb-24 pt-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground">قلب وعقل التحليل في مكان واحد</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="lift rounded-2xl border border-border bg-card p-6 shadow-card">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                  <f.icon className="h-6 w-6 text-primary" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-card-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
