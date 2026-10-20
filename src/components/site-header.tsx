import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

const nav = [
  { to: "/analyze", label: "تحليل جديد" },
  { to: "/tasks", label: "مهامي" },
] as const;

export function SiteHeader() {
  const { user } = useSession();
  const navigate = useNavigate();
  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="bg-gradient-gold flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-glow">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold text-foreground">مستشار التقارير</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
          {user ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="mr-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-muted-foreground hover:text-foreground"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4" /> خروج
            </button>
          ) : (
            <Link
              to="/auth"
              className="bg-gradient-gold mr-2 rounded-lg px-4 py-2 font-semibold text-primary-foreground shadow-glow"
            >
              دخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
