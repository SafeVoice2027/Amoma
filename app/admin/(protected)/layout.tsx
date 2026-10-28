import type { ReactNode } from "react";
import { requireAdminOrHandler } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/login/actions";
import { markUrgentNotificationsRead, fetchUrgentAlerts as pollUrgentAlerts } from "@/app/admin/actions";
import { AdminSidebar } from "@/components/admin-sidebar";
import { fetchUrgentAlerts } from "@/lib/notifications";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdminOrHandler();
  const isAdmin = profile.role === "admin";
  // This layout is shared by both route trees via a re-export (see
  // app/developer/(protected)/layout.tsx) — middleware guarantees isAdmin
  // viewers only ever reach it via /developer, and Handlers only via /admin.
  const basePath = isAdmin ? "/developer" : "/admin";
  const supabase = await createClient();

  // Sidebar badge counts — Account approvals and Bug reports are Admin-only
  // (see supabase/migrations/0010_handlers_and_teacher_tags.sql), so skip
  // both queries entirely for a Handler viewer.
  const [{ count: pendingApprovalsCount }, { count: openBugReportsCount }] = isAdmin
    ? await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bug_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      ])
    : [{ count: 0 }, { count: 0 }];

  const { items: urgentItems, unreadCount: unreadUrgentCount } = await fetchUrgentAlerts(supabase, profile.id);

  async function markUrgentRead() {
    "use server";
    await markUrgentNotificationsRead(basePath);
  }

  return (
    <div className="control-shell flex flex-1 bg-[var(--color-background)]">
      <AdminSidebar
        fullName={profile.full_name ?? (isAdmin ? "Developer" : "Admin")}
        isAdmin={isAdmin}
        onSignOut={logout}
        urgentItems={urgentItems}
        unreadUrgentCount={unreadUrgentCount}
        markUrgentRead={markUrgentRead}
        pollUrgentAlerts={pollUrgentAlerts}
        pendingApprovalsCount={pendingApprovalsCount ?? 0}
        openBugReportsCount={openBugReportsCount ?? 0}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
