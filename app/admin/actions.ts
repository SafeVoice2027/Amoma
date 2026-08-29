"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addFollowup as addFollowupShared } from "@/lib/reports/followups";
import { getCurrentProfile } from "@/lib/auth";
import type { BugReportStatus, ReportStatus } from "@/types/database";

export async function addFollowup(reportId: string, message: string) {
  await addFollowupShared(reportId, message, `/admin/reports/${reportId}`);
}

export async function markUrgentNotificationsRead() {
  const admin = await getCurrentProfile();
  if (!admin) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", admin.id)
    .eq("urgency", "high")
    .is("read_at", null);
  // Most likely cause: supabase/migrations/0005_add_notification_read_at.sql
  // hasn't been run yet — the alert still works, it just can't persist read
  // state until then.
  if (error) console.error("[markUrgentNotificationsRead] update failed", error);

  revalidatePath("/admin");
}

export async function updateReportStatus(reportId: string, status: ReportStatus) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").update({ status }).eq("id", reportId).select("id");
  if (error || !data?.length) {
    console.error("[updateReportStatus] update affected no rows", { reportId, status, error });
  }
  revalidatePath(`/admin/reports/${reportId}`);
}

export async function updateBugReportStatus(bugReportId: string, status: BugReportStatus) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bug_reports")
    .update({ status })
    .eq("id", bugReportId)
    .select("id");
  if (error || !data?.length) {
    console.error("[updateBugReportStatus] update affected no rows", { bugReportId, status, error });
  }
  revalidatePath("/admin/bug-reports");
}

export async function approveAccount(profileId: string) {
  const admin = await getCurrentProfile();
  if (!admin) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ status: "approved", approved_by: admin.id, approved_at: new Date().toISOString() })
    .eq("id", profileId)
    .select("id");
  if (error || !data?.length) {
    console.error("[approveAccount] update affected no rows", { profileId, error });
  }
  revalidatePath("/admin");
}

export async function rejectAccount(profileId: string) {
  const admin = await getCurrentProfile();
  if (!admin) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", profileId)
    .select("id");
  if (error || !data?.length) {
    console.error("[rejectAccount] update affected no rows", { profileId, error });
  }
  revalidatePath("/admin");
}

// Students and staff now choose their own password at signup (see
// app/(auth)/signup/actions.ts) and there's no self-service reset — a
// synthetic LRN email has no real inbox to send a reset link to anyway (see
// app/forgot-password/page.tsx). This is the fallback for "I forgot it" or
// any other login trouble: an admin sets a new one directly. Scoped to
// student/staff profiles only — resetting a fellow admin's password isn't
// exposed here.
export async function changeUserPassword(
  profileId: string,
  newPassword: string,
): Promise<{ error: string | null }> {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") return { error: "Not authorized." };

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .single();

  if (!target || target.role === "admin") {
    return { error: "That account can't be changed here." };
  }

  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(profileId, { password: newPassword });
  if (error) {
    console.error("[changeUserPassword] updateUserById failed", { profileId, error });
    return { error: "Couldn't update the password. Please try again." };
  }

  return { error: null };
}

// Every identity reveal on an anonymous report is logged — this is the only
// path in the app that connects an anonymous report back to a reporter.
// `identity_disclosure_log.reason` is free text (not an enum) in this
// schema, so the category the admin picks and their notes are folded into
// one string before being written to the audit log.
export async function revealIdentity(
  reportId: string,
  reasonCategory: string,
  notes: string,
): Promise<{ name: string; lrn: string | null } | { error: string }> {
  const admin = await getCurrentProfile();
  if (!admin) return { error: "Not authenticated." };

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select("reporter_id")
    .eq("id", reportId)
    .single();
  if (!report) return { error: "Report not found." };

  const { data: reporter } = await supabase
    .from("profiles")
    .select("full_name, lrn")
    .eq("id", report.reporter_id)
    .single();
  if (!reporter) return { error: "Reporter profile not found." };

  const reason = notes ? `${reasonCategory} — ${notes}` : reasonCategory;

  // No authenticated-role INSERT policy exists on identity_disclosure_log by
  // design — only the service role may write to the audit log, so a
  // disclosure can never be recorded (or skipped) by anything but trusted
  // server code.
  const service = createServiceClient();
  const { error: logError } = await service.from("identity_disclosure_log").insert({
    report_id: reportId,
    disclosed_to: admin.id,
    disclosed_by: admin.id,
    reason,
  });
  if (logError) return { error: "Couldn't record the disclosure — identity not revealed." };

  return { name: reporter.full_name ?? "(no name on file)", lrn: reporter.lrn };
}
