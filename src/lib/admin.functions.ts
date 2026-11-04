import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminUserRow {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  isAdmin: boolean;
  analyses: number;
  openTasks: number;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("هذه الصفحة للمدير فقط");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: list, error }, roles, analyses, tasks] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("analyses").select("user_id"),
      supabaseAdmin.from("work_tasks").select("user_id, status"),
    ]);
    if (error) throw new Error("تعذر تحميل المستخدمين");
    const admins = new Set((roles.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    const count = (rows: { user_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.user_id === id).length;
    const users: AdminUserRow[] = list.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      isAdmin: admins.has(u.id),
      analyses: count(analyses.data, u.id),
      openTasks: count((tasks.data ?? []).filter((t) => t.status !== "done"), u.id),
    }));
    users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      me: context.userId,
      users,
      totals: {
        users: users.length,
        admins: admins.size,
        analyses: analyses.data?.length ?? 0,
        openTasks: (tasks.data ?? []).filter((t) => t.status !== "done").length,
      },
    };
  });

export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; admin: boolean }) => {
    if (typeof input?.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.userId) || typeof input.admin !== "boolean") {
      throw new Error("طلب غير صالح");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && !data.admin) throw new Error("لا يمكنك إزالة صلاحية المدير عن نفسك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.admin) {
      const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error("تعذر منح الصلاحية");
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
      if (error) throw new Error("تعذر سحب الصلاحية");
    }
    return { ok: true };
  });
