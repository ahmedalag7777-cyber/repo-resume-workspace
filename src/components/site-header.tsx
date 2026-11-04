import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { useIsAdmin } from "@/lib/use-is-admin";

const nav = [
  { to: "/dashboard", label: "لوحتي" },
  { to: "/analyze", label: "تحليل جديد" },
  { to: "/tasks", label: "المهام" },
] as const;

const linkCls = "whitespace-nowrap rounded-lg px-2.5 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3";

export function SiteHeader() {
  const { user } = useSession();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="bg-gradient-gold flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-glow">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="hidden font-display text-lg font-bold text-foreground sm:inline">مستشار التقارير</span>
        </Link>
        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-sm sm:gap-1">
          {user && nav.map((n) => (
            <Link key={n.to} to={n.to} className={linkCls} activeProps={{ className: "bg-secondary text-foreground" }}>
              {n.label}
            </Link>
          ))}
          {user && isAdmin && (
            <Link to="/admin" className={linkCls} activeProps={{ className: "bg-secondary text-foreground" }}>الإدارة</Link>
          )}
          {user ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="mr-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-muted-foreground hover:text-foreground"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">خروج</span>
            </button>
          ) : (
            <Link to="/auth" className="bg-gradient-gold mr-2 rounded-lg px-4 py-2 font-semibold text-primary-foreground shadow-glow">
              دخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
