"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addFollowup as addFollowupShared } from "@/lib/reports/followups";
import { getCurrentProfile } from "@/lib/auth";
import { fetchUrgentAlerts as fetchUrgentAlertsShared, type UrgentAlertsResult } from "@/lib/notifications";
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

// Polled by UrgentNotificationBell (see components/urgent-notification-bell.tsx)
// so a tab left open notices — and alarms for — a new Critical/Serious
// report without the admin having to navigate or reload. A plain server
// component fetch on page load only ever sees what existed at that moment.
export async function fetchUrgentAlerts(): Promise<UrgentAlertsResult> {
  const admin = await getCurrentProfile();
  if (!admin) return { items: [], unreadCount: 0 };

  const supabase = await createClient();
  return fetchUrgentAlertsShared(supabase, admin.id);
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

// Admin-only: tags a Teacher into a report (see
// supabase/migrations/0010_handlers_and_teacher_tags.sql). Distinct from
// case ownership — a report can be tagged to any number of teachers.
// Fires a notification the same way addFollowup() does for a reporter reply.
export async function tagTeacher(
  reportId: string,
  teacherId: string,
  note: string,
): Promise<{ error: string | null }> {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") return { error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase.from("report_teacher_tags").insert({
    report_id: reportId,
    teacher_id: teacherId,
    tagged_by: admin.id,
    note: note || null,
  });
  if (error) {
    console.error("[tagTeacher] insert failed", { reportId, teacherId, error });
    return { error: "Couldn't tag that teacher. Please try again." };
  }

  const service = createServiceClient();
  await service.from("notifications").insert({
    report_id: reportId,
    recipient_id: teacherId,
    channel: "push",
    urgency: "normal",
    sent_at: new Date().toISOString(),
  });

  revalidatePath(`/admin/reports/${reportId}`);
  return { error: null };
}

// Admin-only toggle, surfaced on the existing Accounts screen rather than a
// new one — the real Handler identities (Prefect of Discipline / CFLFO)
// aren't finalized yet, so this stays a flag any Admin can flip once they
// are, instead of hardcoding specific people.
export async function toggleIsHandler(profileId: string, isHandler: boolean): Promise<{ error: string | null }> {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") return { error: "Not authorized." };

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("role").eq("id", profileId).single();
  if (!target || target.role !== "staff") return { error: "That account can't be changed here." };

  const { error } = await supabase.from("profiles").update({ is_handler: isHandler }).eq("id", profileId);
  if (error) {
    console.error("[toggleIsHandler] update failed", { profileId, error });
    return { error: "Couldn't update that account. Please try again." };
  }

  revalidatePath("/admin/accounts");
  return { error: null };
}

// Admin-only: sets a Teacher's Employee Number (their login identifier in
// place of a DepEd email — see get_login_email_by_employee_number() in
// supabase/migrations/0010_handlers_and_teacher_tags.sql).
export async function setEmployeeNumber(
  profileId: string,
  employeeNumber: string,
): Promise<{ error: string | null }> {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") return { error: "Not authorized." };

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("role").eq("id", profileId).single();
  if (!target || target.role !== "staff") return { error: "That account can't be changed here." };

  const { error } = await supabase
    .from("profiles")
    .update({ employee_number: employeeNumber.trim() || null })
    .eq("id", profileId);
  if (error) {
    console.error("[setEmployeeNumber] update failed", { profileId, error });
    const message = error.code === "23505" ? "That Employee Number is already in use." : "Couldn't update that account. Please try again.";
    return { error: message };
  }

  revalidatePath("/admin/accounts");
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
