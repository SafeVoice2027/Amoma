import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/login/actions";
import { markUrgentNotificationsRead } from "@/app/staff/actions";
import { StaffHeader } from "@/components/staff-header";
import { fetchNotifications, buildUrgentNotificationItems } from "@/lib/notifications";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile("staff");
  const supabase = await createClient();

  const urgentNotifications = await fetchNotifications(supabase, profile.id, { urgency: "high" });
  const reportIds = [...new Set(urgentNotifications.map((n) => n.report_id).filter((id): id is string => !!id))];
  const { data: reports } = reportIds.length
    ? await supabase.from("reports").select("id, created_at").in("id", reportIds)
    : { data: [] as { id: string; created_at: string }[] };
  const reportsById = new Map((reports ?? []).map((r) => [r.id, r]));
  const urgentItems = buildUrgentNotificationItems(urgentNotifications, reportsById);
  const unreadUrgentCount = urgentNotifications.filter((n) => !n.read_at).length;

  return (
    <div className="control-shell flex flex-1 flex-col bg-[var(--color-background)]">
      <StaffHeader
        fullName={profile.full_name ?? "Staff"}
        onSignOut={logout}
        urgentItems={urgentItems}
        unreadUrgentCount={unreadUrgentCount}
        markUrgentRead={markUrgentNotificationsRead}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
