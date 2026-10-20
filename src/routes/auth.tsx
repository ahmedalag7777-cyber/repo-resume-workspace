import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — مستشار التقارير" },
      { name: "description", content: "سجّل دخولك لحفظ تحليلاتك ومهام فريقك." },
      { property: "og:title", content: "تسجيل الدخول — مستشار التقارير" },
      { property: "og:description", content: "سجّل دخولك لحفظ تحليلاتك ومهام فريقك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/analyze" });
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
          if (e2) throw e2;
        }
        toast.success("تم إنشاء حسابك ودخولك مباشرة");
      }
      navigate({ to: "/analyze" });
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(msg.includes("Invalid login") ? "البريد أو كلمة المرور غير صحيحة" : msg);
    } finally {
      setBusy(false);
    }
  };

  const social = async (provider: "google" | "lovable") => {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message ?? "تعذّر تسجيل الدخول");
  };

  const field = "w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass animate-fade-up w-full max-w-md rounded-3xl border border-border p-8 shadow-card">
        <span className="bg-gradient-gold mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground shadow-glow">
          <Sparkles className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-center text-2xl font-bold text-foreground">
          {mode === "signin" ? "مرحباً بعودتك" : "أنشئ حسابك"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "ادخل لمتابعة تحليلاتك ومهام فريقك" : "حسابك يعمل فوراً — بدون انتظار موافقة"}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-secondary p-1 text-sm">
          {(["signin", "signup"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-lg py-2 font-medium transition ${mode === m ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}>
              {m === "signin" ? "دخول" : "حساب جديد"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input type="email" required dir="ltr" placeholder="البريد الإلكتروني" aria-label="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          <input type="password" required minLength={6} dir="ltr" placeholder="كلمة المرور" aria-label="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          <button type="submit" disabled={busy}
            className="bg-gradient-gold flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "دخول" : "إنشاء الحساب والدخول"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-2">
          <button type="button" onClick={() => social("google")}
            className="w-full rounded-xl border border-border bg-background/50 py-3 text-sm font-medium text-foreground hover:bg-secondary">
            المتابعة بحساب Google
          </button>
          <button type="button" className="lovable-auth-button w-full" onClick={() => social("lovable")}>
            Continue with Lovable
          </button>
        </div>

        <Link to="/" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
