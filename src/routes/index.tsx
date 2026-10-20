import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileSpreadsheet,
  ShieldCheck,
  Lightbulb,
  ListChecks,
  Compass,
  ArrowLeft,
} from "lucide-react";

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
      {
        property: "og:description",
        content: "رؤى وتوصيات ومهام يومية من أي ملف تقرير، بدليل من بياناتك نفسها.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: FileSpreadsheet,
    title: "يفهم أي تقرير",
    text: "Excel وCSV وJSON، بالعربية أو الإنجليزية، حتى لو كان نوع التقرير مجهولاً تماماً.",
  },
  {
    icon: Lightbulb,
    title: "رؤى بأسلوب الاستشاري",
    text: "ماذا حدث، لماذا، وماذا يعني ذلك، وما أثره، وما الخطوة التالية، وماذا لو تأخرت.",
  },
  {
    icon: ShieldCheck,
    title: "كل رقم بدليل",
    text: "كل نتيجة مربوطة بأعمدة وأرقام صفوف من ملفك — لا اختراع ولا تخمين.",
  },
  {
    icon: ListChecks,
    title: "مهام يومية لفريقك",
    text: "توزيع تلقائي للمهام حسب التخصص: مبيعات، مشتريات، مخزون، مالية، عمليات.",
  },
  {
    icon: Compass,
    title: "قرارات موثقة",
    text: "اعتمد أو ارفض كل توصية بملاحظة، ويتعلم النظام من قراراتك السابقة.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold text-foreground">مستشار التقارير</span>
          <nav className="flex items-center gap-3">
            <Link to="/tasks" className="text-sm text-muted-foreground hover:text-foreground">
              مهامي
            </Link>
            <Link
              to="/auth"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              دخول
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16 text-center">
          <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
            ارفع تقريرك… واستلم تحليلاً استشارياً كاملاً
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            أي ملف تقارير — مبيعات، مخزون، مالية، أو أي نوع آخر — يتحول إلى رؤى وتحذيرات
            وتوصيات ومهام يومية، وكل رقم مدعوم بدليل من صفوف ملفك.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              ابدأ التحليل الآن
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center rounded-lg border border-border bg-card px-6 py-3 text-base font-medium text-foreground hover:bg-accent"
            >
              إنشاء حساب مجاني
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <f.icon className="h-8 w-8 text-primary" />
              <h2 className="mt-3 text-lg font-semibold text-card-foreground">{f.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
