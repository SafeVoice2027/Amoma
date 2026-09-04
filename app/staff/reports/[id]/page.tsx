import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, PageHeader, SeverityBadge, StatusBadge } from "@/components/ui";
import { FollowupPanel } from "@/components/followup-panel";
import { StatusSelect } from "@/components/status-select";
import { ReportStageTracker } from "@/components/report-stage-tracker";
import { TeacherSchedulingAction } from "@/components/teacher-scheduling-action";
import { addFollowup, updateReportStatus } from "@/app/staff/actions";
import { advanceReportStage } from "@/lib/reports/stage-progress";
import { buildFollowupAuthorLabels } from "@/lib/reports/followup-labels";
import { BULLYING_TYPE_LABELS } from "@/lib/reports/bullying-types";
import type {
  AiAssessment,
  Profile,
  ReportBullyDetails,
  ReportConflictDetails,
  ReportEvidence,
  ReportFollowup,
  ReportStageProgress,
  StaffReportsView,
} from "@/types/database";

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  video: "Video",
  screen_recording: "Screen recording",
  screenshot: "Screenshot",
  photo: "Photo",
};

export default async function StaffReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile("staff");
  // Handlers live on /admin now (see
  // supabase/migrations/0010_handlers_and_teacher_tags.sql) — nothing in
  // the app links here for them anymore, but redirect defensively in case
  // of an old bookmark.
  if (profile.is_handler) redirect(`/admin/reports/${id}`);
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("staff_reports_view")
    .select("id, type, status, severity, is_anonymous, immediate_danger, created_at, description, visible_reporter_id")
    .eq("id", id)
    .single<StaffReportsView & { type: "bully" | "conflict" }>();

  if (!report) notFound();

  const [{ data: bully }, { data: conflict }, { data: followups }, { data: assessments }, { data: evidence }, reporterName] =
    await Promise.all([
      supabase.from("report_bully_details").select("*").eq("report_id", id).maybeSingle<ReportBullyDetails>(),
      supabase.from("report_conflict_details").select("*").eq("report_id", id).maybeSingle<ReportConflictDetails>(),
      supabase
        .from("report_followups")
        .select("*")
        .eq("report_id", id)
        .order("created_at", { ascending: true })
        .returns<ReportFollowup[]>(),
      supabase
        .from("ai_assessments")
        .select("*")
        .eq("report_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<AiAssessment[]>(),
      supabase
        .from("report_evidence")
        .select("*")
        .eq("report_id", id)
        .order("uploaded_at", { ascending: true })
        .returns<ReportEvidence[]>(),
      report.visible_reporter_id
        ? supabase
            .from("profiles")
            .select("full_name")
            .eq("id", report.visible_reporter_id)
            .single()
            .then((r: { data: { full_name: string | null } | null }) => r.data?.full_name ?? null)
        : Promise.resolve(null),
    ]);

  const assessment = assessments?.[0] ?? null;

  // The bucket is private (RLS-gated, not public) — a signed URL is the
  // only way to let staff actually open a file from here.
  const evidenceLinks = await Promise.all(
    (evidence ?? []).map(async (e) => {
      const { data: signed } = await supabase.storage.from("report_evidence").createSignedUrl(e.storage_path, 3600);
      return { ...e, url: signed?.signedUrl ?? null };
    }),
  );

  // Both bully and conflict details carry the same victim/oppressor/setting
  // shape — a report is only ever one type, so exactly one of these is set.
  const details = bully ?? conflict;
  const peopleInvolved =
    [
      details?.victim_grade_section ? `Victim: ${details.victim_grade_section}` : null,
      details?.oppressor_grade_section || details?.oppressor_name
        ? `Oppressor: ${[details.oppressor_grade_section, details.oppressor_name].filter(Boolean).join(" · ")}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "—";
  const settingValue = details?.setting ?? "—";

  // Table doesn't exist until supabase/migrations/0006_report_stage_progress.sql
  // has been run — hide the checklist rather than break the page.
  const { data: stageProgress, error: stageError } = await supabase
    .from("report_stage_progress")
    .select("*")
    .eq("report_id", id)
    .maybeSingle<ReportStageProgress>();
  if (stageError) console.error("[staff report detail] stage progress query failed", stageError);

  // A Teacher tagged into this specific report gets one narrow write action
  // — advancing the Scheduling step — see
  // supabase/migrations/0015_teacher_scheduling_permission.sql. Table
  // doesn't exist until 0010_handlers_and_teacher_tags.sql has been run —
  // fall through to "not tagged" (read-only tracker) rather than break the page.
  const { data: teacherTag, error: teacherTagError } = await supabase
    .from("report_teacher_tags")
    .select("id")
    .eq("report_id", id)
    .eq("teacher_id", profile.id)
    .maybeSingle();
  if (teacherTagError) console.error("[staff report detail] teacher tag query failed", teacherTagError);
  const canScheduleThisReport = !!teacherTag && stageProgress?.current_stage === "meeting";

  const authorIds = [...new Set((followups ?? []).map((f) => f.author_id))];
  const { data: authorProfiles } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", authorIds)
        .returns<Pick<Profile, "id" | "full_name" | "role">[]>()
    : { data: [] as Pick<Profile, "id" | "full_name" | "role">[] };
  const authorLabels = buildFollowupAuthorLabels({
    followups: followups ?? [],
    authorProfiles: authorProfiles ?? [],
    currentUserId: profile.id,
    isAnonymous: report.is_anonymous,
    viewerRole: "staff",
  });

  async function sendMessage(message: string) {
    "use server";
    await addFollowup(id, message);
  }

  async function changeStatus(status: Parameters<typeof updateReportStatus>[1]) {
    "use server";
    await updateReportStatus(id, status);
  }

  async function advanceScheduling() {
    "use server";
    return advanceReportStage(id, `/staff/reports/${id}`);
  }

  return (
    <div>
      <PageHeader
        title={report.type === "bully" ? "Bullying report" : "Conflict report"}
        subtitle={`Submitted ${new Date(report.created_at).toLocaleString()} · ${
          reporterName ?? "Anonymous student"
        }`}
      />

      <div className="mb-6 flex items-center gap-3">
        <SeverityBadge severity={report.severity} />
        <StatusBadge status={report.status} />
        {report.immediate_danger && (
          <span className="rounded-full bg-[var(--color-danger-100)] px-3 py-1 text-sm font-medium text-[var(--color-danger-700)]">
            Flagged immediate danger
          </span>
        )}
        <div className="ml-auto">
          <StatusSelect status={report.status} onChange={changeStatus} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Report details</h2>
            <dl className="space-y-3 text-sm">
              <Field label="Description" value={report.description ?? "—"} />
              {bully && (
                <>
                  <Field
                    label="Type of bullying"
                    value={bully.bullying_types.map((t) => BULLYING_TYPE_LABELS[t]).join(", ") || "—"}
                  />
                  <Field label="Victim" value={bully.victim_grade_section ?? "—"} />
                  <Field
                    label="Oppressor"
                    value={[bully.oppressor_grade_section, bully.oppressor_name].filter(Boolean).join(" · ") || "—"}
                  />
                  <Field label="Setting" value={bully.setting ?? "—"} />
                </>
              )}
              {conflict && (
                <>
                  <Field label="Victim" value={conflict.victim_grade_section ?? "—"} />
                  <Field
                    label="Oppressor"
                    value={
                      [conflict.oppressor_grade_section, conflict.oppressor_name].filter(Boolean).join(" · ") || "—"
                    }
                  />
                  <Field label="Setting" value={conflict.setting ?? "—"} />
                </>
              )}
            </dl>
          </Card>

          {assessment && (
            <Card>
              <h2 className="mb-3 text-lg font-semibold">AI assessment</h2>
              <dl className="space-y-3 text-sm">
                <Field label="Report content" value={report.description ?? "—"} />
                <Field label="People involved" value={peopleInvolved} />
                <Field label="Setting" value={settingValue} />
                <div>
                  <dt className="text-[var(--color-text-muted)]">Evidence</dt>
                  <dd className="mt-0.5">
                    {evidenceLinks.length === 0 ? (
                      "—"
                    ) : (
                      <ul className="space-y-1">
                        {evidenceLinks.map((e) => (
                          <li key={e.id}>
                            {e.url ? (
                              <a
                                href={e.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--color-brand)] hover:underline"
                              >
                                {EVIDENCE_TYPE_LABELS[e.file_type] ?? e.file_type}
                              </a>
                            ) : (
                              <span>{EVIDENCE_TYPE_LABELS[e.file_type] ?? e.file_type}</span>
                            )}
                            <span className="text-[var(--color-text-muted)]">
                              {" "}
                              · {new Date(e.uploaded_at).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <p className="text-sm text-[var(--color-text-muted)]">{assessment.staff_summary}</p>
                {assessment.recommendation && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                    {assessment.recommendation.split("\n").map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )}

          {/* Teachers mostly see case progress without acting on it — the
              checklist itself is driven from /admin/reports/[id] by
              Handlers/Admin (see supabase/migrations/0010_handlers_and_teacher_tags.sql).
              The one exception: a Teacher tagged into this report can
              confirm the Scheduling step themselves once it's current (see
              supabase/migrations/0015_teacher_scheduling_permission.sql). */}
          {stageProgress && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Case status</h2>
              <ReportStageTracker
                role="staff"
                reportId={id}
                reportCreatedAt={report.created_at}
                initialProgress={stageProgress}
              />
              {canScheduleThisReport && <TeacherSchedulingAction advance={advanceScheduling} />}
            </Card>
          )}
        </div>

        <FollowupPanel
          followups={followups ?? []}
          currentUserId={profile.id}
          authorLabels={authorLabels}
          sendMessage={sendMessage}
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
