"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { classifySeverity } from "@/lib/ai/severity";
import { getSupportReply, type SupportChatContext } from "@/lib/ai/support-chat";
import { getCurrentProfile } from "@/lib/auth";
import type { ReportCategory, SeverityLevel } from "@/types/database";

const BULLY_CATEGORIES: ReportCategory[] = ["social", "cyber", "physical", "verbal"];

const FREQUENCY_LABELS: Record<string, string> = {
  one_time: "One time",
  a_few_times: "A few times",
  ongoing: "Ongoing / regularly",
};

export type SubmitBullyResult =
  | { error: string }
  | { success: true; severity: SeverityLevel; id: string; createdAt: string };

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

export async function submitBullyReport(formData: FormData): Promise<SubmitBullyResult> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();

  const inDanger = formData.get("in_immediate_danger") === "true";
  const isAnonymous = formData.get("is_anonymous") === "true";
  const description = String(formData.get("description") ?? "");
  const additionalNote = String(formData.get("additional_note") ?? "").trim();
  const offenderDescription = String(formData.get("offender_description") ?? "");
  const bullyTypeRaw = String(formData.get("bully_type") ?? "");
  const bullyType = BULLY_CATEGORIES.includes(bullyTypeRaw as ReportCategory)
    ? (bullyTypeRaw as ReportCategory)
    : null;
  // "yes" | "no" | "unsure" -> true | false | null
  const happenedBeforeRaw = String(formData.get("happened_before") ?? "");
  const happenedBefore = happenedBeforeRaw === "yes" ? true : happenedBeforeRaw === "no" ? false : null;
  const frequency = String(formData.get("frequency") ?? "");
  const location = String(formData.get("location") ?? "");
  const occurredAt = String(formData.get("occurred_at") ?? "");
  const witnesses = String(formData.get("witnesses") ?? "");

  const fullDescription = additionalNote ? `${description}\n\nAdditional note: ${additionalNote}` : description;

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      type: "bully",
      reporter_id: profile.id,
      school_id: profile.school_id,
      is_anonymous: isAnonymous,
      immediate_danger: inDanger,
      description: fullDescription,
    })
    .select("id, school_id, created_at")
    .single();

  if (error || !report) {
    return { error: "We couldn't submit your report right now. Please try again." };
  }

  await supabase.from("report_bully_details").insert({
    report_id: report.id,
    offender_description: offenderDescription || null,
    happened_before: happenedBefore,
    prior_incident_details: happenedBefore && frequency ? `Frequency: ${FREQUENCY_LABELS[frequency]}` : null,
    location: location || null,
    occurred_at: occurredAt || null,
    witnesses: witnesses || null,
  });

  const files = formData.getAll("evidence").filter((f): f is File => f instanceof File);
  if (files.length) await uploadEvidence(supabase, report.id, profile.id, files);

  const assessment = await classifySeverity({
    description: fullDescription,
    isRepeatOccurrence: happenedBefore ?? false,
    inImmediateDanger: inDanger,
  });

  const service = createServiceClient();
  await service.from("ai_assessments").insert({
    report_id: report.id,
    severity: assessment.severity,
    staff_summary: assessment.rationale,
    recommendation: assessment.recommendations.join("\n"),
    model_version: assessment.modelVersion,
  });
  // Separate updates so a failure on one (e.g. the `category` column not
  // existing yet on an unmigrated database) can't silently prevent the
  // other from saving.
  const { error: severityError } = await service
    .from("reports")
    .update({ severity: assessment.severity })
    .eq("id", report.id);
  if (severityError) console.error("[submitBullyReport] failed to save severity", severityError);

  if (bullyType) {
    const { error: categoryError } = await service
      .from("reports")
      .update({ category: bullyType })
      .eq("id", report.id);
    if (categoryError) console.error("[submitBullyReport] failed to save category", categoryError);
  }

  await alertOnCritical(report.id, report.school_id, assessment.severity);

  revalidatePath("/student");
  return { success: true, severity: assessment.severity, id: report.id, createdAt: report.created_at };
}

export async function submitConflictReport(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();

  const inDanger = formData.get("in_immediate_danger") === "true";
  const isAnonymous = formData.get("is_anonymous") === "true";
  const conflictReason = String(formData.get("conflict_reason") ?? "");
  const dominantPartyDescription = String(formData.get("dominant_party_description") ?? "");
  const wantsSolution = formData.get("wants_solution") === "true";
  const wantsBreathingExercise = formData.get("wants_breathing_exercise") === "true";

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      type: "conflict",
      reporter_id: profile.id,
      school_id: profile.school_id,
      is_anonymous: isAnonymous,
      immediate_danger: inDanger,
      description: conflictReason,
    })
    .select("id")
    .single();

  if (error || !report) {
    return { error: "We couldn't submit your report right now. Please try again." };
  }

  // Separate update (not part of the insert above) so a database that
  // hasn't run the `category` column migration yet
  // (supabase/migrations/0002_add_report_category.sql) still lets the
  // report itself save — category just silently doesn't persist until then,
  // same defensive pattern as submitBullyReport.
  const service = createServiceClient();
  const { error: categoryError } = await service
    .from("reports")
    .update({ category: "conflict" })
    .eq("id", report.id);
  if (categoryError) console.error("[submitConflictReport] failed to save category", categoryError);

  await supabase.from("report_conflict_details").insert({
    report_id: report.id,
    conflict_reason: conflictReason,
    dominant_party_description: dominantPartyDescription || null,
    wants_solution: wantsSolution,
    wants_breathing_exercise: wantsBreathingExercise,
  });

  redirect("/student");
}

// Ephemeral post-submission support chat — never persisted, distinct from
// the report_followups thread (which is the record staff/admin see).
export async function sendSupportChatMessage(
  context: SupportChatContext,
): Promise<{ reply: string } | { error: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please sign in again to keep chatting." };

  const reply = await getSupportReply(context);
  return { reply };
}
