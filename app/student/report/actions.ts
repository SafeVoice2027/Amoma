"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { classifySeverity } from "@/lib/ai/severity";
import { getCurrentProfile } from "@/lib/auth";
import type { BullyingType, SeverityLevel } from "@/types/database";

const BULLYING_TYPES: BullyingType[] = ["social", "cyber", "physical", "verbal"];

export type SubmitBullyResult =
  | { error: string }
  | { success: true; severity: SeverityLevel; id: string; createdAt: string };

export type SubmitConflictResult = { error: string } | { success: true; id: string; createdAt: string };

function evidenceTypeFromMime(mime: string): string {
  if (mime.startsWith("video")) return "video";
  if (mime.startsWith("image")) return "photo";
  return "screenshot";
}

async function uploadEvidence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
  userId: string,
  files: File[],
) {
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const path = `${reportId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("report_evidence").upload(path, file);
    if (error) continue;
    await supabase.from("report_evidence").insert({
      report_id: reportId,
      storage_path: path,
      file_type: evidenceTypeFromMime(file.type),
      uploaded_by: userId,
    });
  }
}

// Fires a high-urgency, distinct-tone alert to staff + counselors at the
// report's school. A real deployment would fan this out over SMS/push via a
// Supabase Database Webhook; here we record the notification row that drives
// it. Only critical-severity reports trigger this — the most urgent tier.
async function alertOnCritical(reportId: string, schoolId: string | null, severity: string) {
  if (severity !== "critical" || !schoolId) return;

  const service = createServiceClient();
  const { data: recipients } = await service
    .from("profiles")
    .select("id")
    .eq("school_id", schoolId)
    .in("role", ["staff", "admin"])
    .eq("status", "approved")
    .returns<{ id: string }[]>();

  if (!recipients?.length) return;

  await service.from("notifications").insert(
    recipients.map((r) => ({
      recipient_id: r.id,
      report_id: reportId,
      channel: "push" as const,
      urgency: "high" as const,
      sent_at: new Date().toISOString(),
    })),
  );
}

// Handlers triage every incoming report (not just critical ones — that's
// what alertOnCritical above is for), so they get a notification row on
// every submission. Separate, normal-urgency path so this doesn't also
// trigger the "high" urgency alarm sound in UrgentNotificationBell for
// routine reports. See supabase/migrations/0010_handlers_and_teacher_tags.sql.
async function notifyHandlersOfNewReport(reportId: string, schoolId: string | null) {
  if (!schoolId) return;

  const service = createServiceClient();
  const { data: handlers } = await service
    .from("profiles")
    .select("id")
    .eq("school_id", schoolId)
    .eq("role", "staff")
    .eq("is_handler", true)
    .eq("status", "approved")
    .returns<{ id: string }[]>();

  if (!handlers?.length) return;

  await service.from("notifications").insert(
    handlers.map((h) => ({
      recipient_id: h.id,
      report_id: reportId,
      channel: "push" as const,
      urgency: "normal" as const,
      sent_at: new Date().toISOString(),
    })),
  );
}

export async function submitBullyReport(formData: FormData): Promise<SubmitBullyResult> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();

  const inDanger = formData.get("in_immediate_danger") === "true";
  const isAnonymous = formData.get("is_anonymous") === "true";
  const description = String(formData.get("description") ?? "");
  const bullyingTypes = formData
    .getAll("bullying_types")
    .map((v) => String(v))
    .filter((v): v is BullyingType => BULLYING_TYPES.includes(v as BullyingType));
  const victimGradeSection = String(formData.get("victim_grade_section") ?? "").trim();
  const oppressorGradeSection = String(formData.get("oppressor_grade_section") ?? "").trim();
  const oppressorName = String(formData.get("oppressor_name") ?? "").trim();
  const setting = String(formData.get("setting") ?? "").trim();

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      type: "bully",
      reporter_id: profile.id,
      school_id: profile.school_id,
      is_anonymous: isAnonymous,
      immediate_danger: inDanger,
      description,
      // Single-value column kept for the existing category filter/badge UI —
      // the full multi-select set lives in report_bully_details.bullying_types.
      category: bullyingTypes[0] ?? null,
    })
    .select("id, school_id, created_at")
    .single();

  if (error || !report) {
    return { error: "We couldn't submit your report right now. Please try again." };
  }

  await supabase.from("report_bully_details").insert({
    report_id: report.id,
    bullying_types: bullyingTypes,
    victim_grade_section: victimGradeSection || null,
    oppressor_grade_section: oppressorGradeSection || null,
    oppressor_name: oppressorName || null,
    setting: setting || null,
  });

  const files = formData.getAll("evidence").filter((f): f is File => f instanceof File);
  if (files.length) await uploadEvidence(supabase, report.id, profile.id, files);

  const assessment = await classifySeverity({
    description,
    bullyingTypes,
    inImmediateDanger: inDanger,
    victimGradeSection: victimGradeSection || null,
    oppressorGradeSection: oppressorGradeSection || null,
    oppressorName: oppressorName || null,
    setting: setting || null,
  });

  const service = createServiceClient();
  await service.from("ai_assessments").insert({
    report_id: report.id,
    severity: assessment.severity,
    staff_summary: assessment.rationale,
    recommendation: assessment.recommendations.join("\n"),
    model_version: assessment.modelVersion,
  });
  const { error: severityError } = await service
    .from("reports")
    .update({ severity: assessment.severity })
    .eq("id", report.id);
  if (severityError) console.error("[submitBullyReport] failed to save severity", severityError);

  await alertOnCritical(report.id, report.school_id, assessment.severity);
  await notifyHandlersOfNewReport(report.id, report.school_id);

  revalidatePath("/student");
  return { success: true, severity: assessment.severity, id: report.id, createdAt: report.created_at };
}

export async function submitConflictReport(formData: FormData): Promise<SubmitConflictResult> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();

  const inDanger = formData.get("in_immediate_danger") === "true";
  const isAnonymous = formData.get("is_anonymous") === "true";
  const conflictReason = String(formData.get("conflict_reason") ?? "");
  const victimGradeSection = String(formData.get("victim_grade_section") ?? "").trim();
  const oppressorGradeSection = String(formData.get("oppressor_grade_section") ?? "").trim();
  const oppressorName = String(formData.get("oppressor_name") ?? "").trim();
  const setting = String(formData.get("setting") ?? "").trim();

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      type: "conflict",
      reporter_id: profile.id,
      school_id: profile.school_id,
      is_anonymous: isAnonymous,
      immediate_danger: inDanger,
      description: conflictReason,
      category: "conflict",
    })
    .select("id, created_at")
    .single();

  if (error || !report) {
    return { error: "We couldn't submit your report right now. Please try again." };
  }

  await supabase.from("report_conflict_details").insert({
    report_id: report.id,
    conflict_reason: conflictReason,
    victim_grade_section: victimGradeSection || null,
    oppressor_grade_section: oppressorGradeSection || null,
    oppressor_name: oppressorName || null,
    setting: setting || null,
  });

  const files = formData.getAll("evidence").filter((f): f is File => f instanceof File);
  if (files.length) await uploadEvidence(supabase, report.id, profile.id, files);

  await notifyHandlersOfNewReport(report.id, profile.school_id);

  revalidatePath("/student");
  return { success: true, id: report.id, createdAt: report.created_at };
}
