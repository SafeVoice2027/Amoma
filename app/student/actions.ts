"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { addFollowup as addFollowupShared } from "@/lib/reports/followups";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/lib/auth";
import { LANGUAGE_COOKIE, isLanguage, type Language } from "@/lib/i18n/languages";

export async function addFollowup(reportId: string, message: string) {
  await addFollowupShared(reportId, message, "/student");
}

// Saves the student's language choice: on their profile (so it follows them
// to another device) and in a cookie (so it works on this device even before
// supabase/migrations/0028_profile_language.sql has been run).
export async function setLanguage(lang: Language) {
  if (!isLanguage(lang)) return;

  (await cookies()).set(LANGUAGE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const profile = await getCurrentProfile();
  if (profile) {
    const { error } = await createServiceClient().from("profiles").update({ language: lang }).eq("id", profile.id);
    if (error) console.error("[setLanguage] profile update failed (has 0028 been run?)", error);
  }

  revalidatePath("/student", "layout");
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
