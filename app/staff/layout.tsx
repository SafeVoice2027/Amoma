import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/login/actions";
import {
  markUrgentNotificationsRead,
  fetchUrgentAlerts as pollUrgentAlerts,
} from "@/app/staff/actions";
import { StaffHeader } from "@/components/staff-header";
import { fetchUrgentAlerts } from "@/lib/notifications";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile("staff");
  const supabase = await createClient();

  const { items: urgentItems, unreadCount: unreadUrgentCount } = await fetchUrgentAlerts(supabase, profile.id);

  return (
    <div className="control-shell flex flex-1 flex-col bg-[var(--color-background)]">
      <StaffHeader
        fullName={profile.full_name ?? "Staff"}
        onSignOut={logout}
        urgentItems={urgentItems}
        unreadUrgentCount={unreadUrgentCount}
        markUrgentRead={markUrgentNotificationsRead}
        pollUrgentAlerts={pollUrgentAlerts}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
