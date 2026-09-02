"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addFollowup as addFollowupShared } from "@/lib/reports/followups";
import { getCurrentProfile } from "@/lib/auth";

export async function addFollowup(reportId: string, message: string) {
  await addFollowupShared(reportId, message, "/student");
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
