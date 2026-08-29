"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addFollowup as addFollowupShared } from "@/lib/reports/followups";
import { getCurrentProfile } from "@/lib/auth";
import type { MeetingResponse } from "@/types/database";

export async function addFollowup(reportId: string, message: string) {
  await addFollowupShared(reportId, message, "/student");
}

export async function submitMeetingResponse(reportId: string, response: MeetingResponse) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_meeting_response", {
    p_report_id: reportId,
    p_response: response,
  });
  // Most likely cause: supabase/migrations/0008_meeting_response.sql hasn't
  // been run yet — fail quietly rather than break the page over this.
  if (error) console.error("[submitMeetingResponse] rpc failed", error);

  revalidatePath("/student");
  revalidatePath(`/student/reports/${reportId}`);
}

export async function markAllNotificationsRead() {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.id)
    .is("read_at", null);
  // Most likely cause: supabase/migrations/0005_add_notification_read_at.sql
  // hasn't been run yet — the bell still works, it just can't persist read
  // state until then.
  if (error) console.error("[markAllNotificationsRead] update failed", error);

  revalidatePath("/student");
}
