"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addFollowup as addFollowupShared } from "@/lib/reports/followups";
import { getCurrentProfile } from "@/lib/auth";
import { fetchUrgentAlerts as fetchUrgentAlertsShared, type UrgentAlertsResult } from "@/lib/notifications";
import type { ReportStatus } from "@/types/database";

export async function addFollowup(reportId: string, message: string) {
  await addFollowupShared(reportId, message, `/staff/reports/${reportId}`);
}

export async function markUrgentNotificationsRead() {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.id)
    .eq("urgency", "high")
    .is("read_at", null);
  // Most likely cause: supabase/migrations/0005_add_notification_read_at.sql
  // hasn't been run yet — the alert still works, it just can't persist read
  // state until then.
  if (error) console.error("[markUrgentNotificationsRead] update failed", error);

  revalidatePath("/staff");
}

// Polled by UrgentNotificationBell (see components/urgent-notification-bell.tsx)
// so a tab left open notices — and alarms for — a new Critical/Serious
// report without the staff member having to navigate or reload. A plain
// server component fetch on page load only ever sees what existed then.
export async function fetchUrgentAlerts(): Promise<UrgentAlertsResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { items: [], unreadCount: 0 };

  const supabase = await createClient();
  return fetchUrgentAlertsShared(supabase, profile.id);
}

// A Teacher opening a tag from their mail inbox (components/teacher-tags-mail.tsx)
// marks it read. RLS restricts this update to the tagged teacher themselves
// (see supabase/migrations/0010_handlers_and_teacher_tags.sql).
export async function markTeacherTagRead(tagId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("report_teacher_tags")
    .update({ read_at: new Date().toISOString() })
    .eq("id", tagId)
    .is("read_at", null);
  if (error) console.error("[markTeacherTagRead] update failed", { tagId, error });
  revalidatePath("/staff");
}

// The real RLS policy only lets a staff member UPDATE a report already
// assigned to them (`assigned_staff_id = auth.uid()`) — there's no policy
// allowing them to self-assign first, so that first write has to go through
// the service role. Whoever changes a report's status becomes its owner.
export async function updateReportStatus(reportId: string, status: ReportStatus) {
  const staff = await getCurrentProfile();
  if (!staff) return;

  const service = createServiceClient();
  await service.from("reports").update({ status, assigned_staff_id: staff.id }).eq("id", reportId);
  revalidatePath(`/staff/reports/${reportId}`);
  revalidatePath("/staff");
}
