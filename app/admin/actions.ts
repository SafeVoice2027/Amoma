"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addFollowup as addFollowupShared } from "@/lib/reports/followups";
import { getCurrentProfile } from "@/lib/auth";
import {
  canDecideRequest,
  canManageStaff,
  canResetPassword,
  getAccountManager,
  type AccountTarget,
} from "@/lib/accounts/manager";
import { fetchUrgentAlerts as fetchUrgentAlertsShared, type UrgentAlertsResult } from "@/lib/notifications";
import type { AdminPosition, BugReportStatus, ReportStatus } from "@/types/database";

// This whole file is shared by Handler ("Admin", under /admin/*) and the
// real superuser ("Developer", under /developer/*) — see
// lib/supabase/middleware.ts for why those two never mix anymore. Anything
// below that revalidates a path needs the CALLER's own basePath so it
// invalidates the tree the viewer is actually looking at, not the other one.
type DashboardBasePath = "/admin" | "/developer";

export async function addFollowup(reportId: string, message: string, basePath: DashboardBasePath) {
  await addFollowupShared(reportId, message, `${basePath}/reports/${reportId}`);
}

export async function markUrgentNotificationsRead(basePath: DashboardBasePath) {
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

  revalidatePath(basePath);
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

export async function updateReportStatus(reportId: string, status: ReportStatus, basePath: DashboardBasePath) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").update({ status }).eq("id", reportId).select("id");
  if (error || !data?.length) {
    console.error("[updateReportStatus] update affected no rows", { reportId, status, error });
  }
  revalidatePath(`${basePath}/reports/${reportId}`);
}

// Bug reports are Developer-only (see app/developer/(protected)/bug-reports/page.tsx)
// — no basePath needed, there's only one place this is ever called from.
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
  revalidatePath("/developer/bug-reports");
}

// Account requests (staff asking for access). The Developer decides any
// school's; a school's Learner Formation Officer decides their own school's.
// Checked on the server against the person's real role and school — see
// lib/accounts/manager.ts.
async function decideRequest(profileId: string, decision: "approved" | "rejected") {
  const manager = await getAccountManager();
  if (!manager) return;

  const service = createServiceClient();
  const { data: target } = await service
    .from("profiles")
    .select("id, role, is_handler, school_id, status")
    .eq("id", profileId)
    .maybeSingle<AccountTarget>();
  if (!target || !canDecideRequest(manager, target)) {
    console.error("[decideRequest] not allowed or not found", { profileId, decision });
    return;
  }

  const update =
    decision === "approved"
      ? { status: "approved", approved_by: manager.profile.id, approved_at: new Date().toISOString() }
      : { status: "rejected" };
  const { error } = await service.from("profiles").update(update).eq("id", profileId);
  if (error) console.error("[decideRequest] update failed", { profileId, error });
  revalidateAccountPages();
}

export async function approveAccount(profileId: string) {
  await decideRequest(profileId, "approved");
}

export async function rejectAccount(profileId: string) {
  await decideRequest(profileId, "rejected");
}

function revalidateAccountPages() {
  for (const base of ["/admin", "/developer"]) {
    revalidatePath(base);
    revalidatePath(`${base}/accounts`);
  }
}

// Both Admin (Handler) and Developer can mark an annual report printed —
// RLS on annual_reports allows exactly those two (see
// supabase/migrations/0023_annual_reports_handler_access.sql).
export async function markAnnualReportPrinted(
  id: string,
  basePath: DashboardBasePath,
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  const allowed = profile && (profile.role === "admin" || (profile.role === "staff" && profile.is_handler));
  if (!profile || !allowed) return { error: "Not authorized." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("annual_reports")
    .update({ printed: true, printed_at: new Date().toISOString(), printed_by: profile.id })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    console.error("[markAnnualReportPrinted] update affected no rows", { id, error });
    return { error: "Couldn't mark that report as printed. Please try again." };
  }

  revalidatePath(`${basePath}/overview/annual`);
  return { error: null };
}

// Students and staff choose their own password and there's no self-service
// reset — a synthetic LRN email has no real inbox to send a reset link to (see
// app/forgot-password/page.tsx). This is the fallback for "I forgot it" or any
// other login trouble: an Admin sets a new one directly. An Admin can do this
// for the students and teachers of their own school; the Learner Formation
// Officer (and the Developer) also for other Admins. The Developer account
// itself can't be changed here.
export async function changeUserPassword(
  profileId: string,
  newPassword: string,
): Promise<{ error: string | null }> {
  const manager = await getAccountManager();
  if (!manager) return { error: "Not authorized." };

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const service = createServiceClient();
  const { data: target } = await service
    .from("profiles")
    .select("id, role, is_handler, school_id")
    .eq("id", profileId)
    .maybeSingle<AccountTarget>();

  if (!target || !canResetPassword(manager, target)) {
    return { error: "That account can't be changed here." };
  }

  const { error } = await service.auth.admin.updateUserById(profileId, { password: newPassword });
  if (error) {
    console.error("[changeUserPassword] updateUserById failed", { profileId, error });
    return { error: "Couldn't update the password. Please try again." };
  }

  return { error: null };
}

// Make a staff member an Admin, or take it away. The Learner Formation Officer
// of a school can do this for their own school's staff; so can the Developer.
export async function toggleIsHandler(profileId: string, isHandler: boolean): Promise<{ error: string | null }> {
  const manager = await getAccountManager();
  if (!manager) return { error: "Not authorized." };

  const service = createServiceClient();
  const { data: target } = await service
    .from("profiles")
    .select("id, role, is_handler, school_id")
    .eq("id", profileId)
    .maybeSingle<AccountTarget>();
  if (!target || !canManageStaff(manager, target)) return { error: "That account can't be changed here." };

  // Turning Admin on defaults to Learner Formation Officer so the account can
  // tag right away; switching it off clears the position.
  const { error } = await service
    .from("profiles")
    .update({ is_handler: isHandler, admin_position: isHandler ? "learner_formation_officer" : null })
    .eq("id", profileId);
  if (error) {
    console.error("[toggleIsHandler] update failed", { profileId, error });
    return { error: "Couldn't update that account. Please try again." };
  }

  revalidateAccountPages();
  return { error: null };
}

// Which Admin position an Admin account holds. Cases are viewed by all
// Admins; only the Learner Formation Officer tags teachers.
export async function setAdminPosition(
  profileId: string,
  position: AdminPosition,
): Promise<{ error: string | null }> {
  const manager = await getAccountManager();
  if (!manager) return { error: "Not authorized." };
  const positions: AdminPosition[] = ["learner_formation_officer", "guidance_counselor", "school_head"];
  if (!positions.includes(position)) return { error: "Invalid position." };

  const service = createServiceClient();
  const { data: target } = await service
    .from("profiles")
    .select("id, role, is_handler, school_id")
    .eq("id", profileId)
    .maybeSingle<AccountTarget>();
  if (!target || !canManageStaff(manager, target) || !target.is_handler) {
    return { error: "That account can't be changed here." };
  }

  const { error } = await service.from("profiles").update({ admin_position: position }).eq("id", profileId);
  if (error) {
    console.error("[setAdminPosition] update failed", { profileId, error });
    return { error: "Couldn't update that account. Please try again." };
  }

  revalidateAccountPages();
  return { error: null };
}

// Sets a staff member's Employee Number (their login identifier in place of a
// DepEd email — see get_login_email_by_employee_number() in
// supabase/migrations/0010_handlers_and_teacher_tags.sql).
export async function setEmployeeNumber(
  profileId: string,
  employeeNumber: string,
): Promise<{ error: string | null }> {
  const manager = await getAccountManager();
  if (!manager) return { error: "Not authorized." };

  const service = createServiceClient();
  const { data: target } = await service
    .from("profiles")
    .select("id, role, is_handler, school_id")
    .eq("id", profileId)
    .maybeSingle<AccountTarget>();
  if (!target || !canManageStaff(manager, target)) return { error: "That account can't be changed here." };

  const { error } = await service
    .from("profiles")
    .update({ employee_number: employeeNumber.trim() || null })
    .eq("id", profileId);
  if (error) {
    console.error("[setEmployeeNumber] update failed", { profileId, error });
    const message = error.code === "23505" ? "That Employee Number is already in use." : "Couldn't update that account. Please try again.";
    return { error: message };
  }

  revalidateAccountPages();
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
