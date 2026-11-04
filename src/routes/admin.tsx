import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Users, FileSpreadsheet, ListChecks } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/use-session";
import { getAdminOverview, setAdminRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — مستشار التقارير" },
      { name: "description", content: "إدارة المستخدمين والصلاحيات ومتابعة نشاط التحليلات في مستشار التقارير." },
      { property: "og:title", content: "لوحة الإدارة — مستشار التقارير" },
      { property: "og:description", content: "المستخدمون والصلاحيات ونشاط التحليلات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

const dateFmt = (s: string | null) => (s ? new Date(s).toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" }) : "—");

function AdminPage() {
  const { user, loading } = useSession();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getAdminOverview);
  const changeRole = useServerFn(setAdminRole);
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin_overview", user?.id],
    enabled: !!user,
    retry: false,
    queryFn: () => fetchOverview(),
  });

  const toggle = async (userId: string, admin: boolean) => {
    try {
      await changeRole({ data: { userId, admin } });
      toast.success(admin ? "أصبح مديراً" : "سُحبت صلاحية المدير");
      qc.invalidateQueries({ queryKey: ["admin_overview"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">لوحة الإدارة</h1>
        </div>
        {!loading && !user && <p className="text-muted-foreground"><Link to="/auth" className="text-primary hover:underline">سجّل دخولك</Link> أولاً.</p>}
        {(isLoading || loading) && user !== null && <p className="text-muted-foreground">جارٍ التحميل…</p>}
        {error && <p className="rounded-xl border border-destructive/50 bg-card p-6 text-destructive">{(error as Error).message}</p>}
        {data && (
          <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="ملخص المنصة">
              {[
                { icon: Users, label: "المستخدمون", value: data.totals.users },
                { icon: ShieldCheck, label: "المدراء", value: data.totals.admins },
                { icon: FileSpreadsheet, label: "التحليلات", value: data.totals.analyses },
                { icon: ListChecks, label: "مهام مفتوحة", value: data.totals.openTasks },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
                  <k.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-2xl font-bold text-card-foreground">{k.value}</p>
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                </div>
              ))}
            </section>
            <section className="overflow-x-auto rounded-2xl border border-border bg-card" aria-label="المستخدمون">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="p-3 text-right font-normal">البريد</th>
                    <th className="p-3 text-right font-normal">التسجيل</th>
                    <th className="p-3 text-right font-normal">آخر دخول</th>
                    <th className="p-3 text-right font-normal">تحليلات</th>
                    <th className="p-3 text-right font-normal">مهام مفتوحة</th>
                    <th className="p-3 text-right font-normal">الصلاحية</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="p-3 text-foreground"><bdi>{u.email ?? "—"}</bdi>{u.id === data.me && <span className="mr-2 text-xs text-primary">(أنت)</span>}</td>
                      <td className="p-3 text-muted-foreground">{dateFmt(u.createdAt)}</td>
                      <td className="p-3 text-muted-foreground">{dateFmt(u.lastSignInAt)}</td>
                      <td className="p-3 text-foreground">{u.analyses}</td>
                      <td className="p-3 text-foreground">{u.openTasks}</td>
                      <td className="p-3">
                        {u.isAdmin ? (
                          <Button size="sm" variant="outline" disabled={u.id === data.me} onClick={() => toggle(u.id, false)}>مدير — سحب</Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => toggle(u.id, true)}>ترقية لمدير</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <p className="text-xs text-muted-foreground">التسجيل مفتوح ويمنح دخولاً فورياً دون موافقة. كل تغيير صلاحية يُتحقق منه على الخادم.</p>
          </>
        )}
      </main>
    </div>
  );
}
