"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { addFollowup as addFollowupShared } from "@/lib/reports/followups";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

export type ChangePasswordResult = { error: null | "unauthorized" | "wrong_current" | "short" | "same" | "failed" };

// A student changes their OWN password — only while signed in to that account,
// and only after proving they know the current one. The current password is
// checked with a throwaway client (no session saved) so the real session is
// untouched; the new one is then set through the student's own session, so it
// can only ever change the account that is signed in.
export async function changeOwnPassword(current: string, next: string): Promise<ChangePasswordResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "student") return { error: "unauthorized" };
  if (typeof next !== "string" || next.length < 8) return { error: "short" };
  if (next === current) return { error: "same" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "unauthorized" };

  const verifier = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: verifyError } = await verifier.auth.signInWithPassword({ email: user.email, password: current });
  if (verifyError) return { error: "wrong_current" };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    console.error("[changeOwnPassword] updateUser failed", error.message);
    return { error: "failed" };
  }
  return { error: null };
}

// First sign-in on a school-created account: the student either picks their
// own password (the session itself proves who they are, so the current one isn't
// asked again) or keeps the school's. Both end the prompt. Only works while the
// account is still flagged must_choose_password.
export async function setFirstPassword(next: string): Promise<ChangePasswordResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "student" || !profile.must_choose_password) return { error: "unauthorized" };
  if (typeof next !== "string" || next.length < 8) return { error: "short" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    console.error("[setFirstPassword] updateUser failed", error.message);
    return { error: "failed" };
  }
  await createServiceClient().from("profiles").update({ must_choose_password: false }).eq("id", profile.id);
  revalidatePath("/student", "layout");
  return { error: null };
}

export async function keepSchoolPassword(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "student" || !profile.must_choose_password) return;
  await createServiceClient().from("profiles").update({ must_choose_password: false }).eq("id", profile.id);
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
