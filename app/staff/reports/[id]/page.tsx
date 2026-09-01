import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, PageHeader, SeverityBadge, StatusBadge } from "@/components/ui";
import { FollowupPanel } from "@/components/followup-panel";
import { StatusSelect } from "@/components/status-select";
import { StaffStageChecklist } from "@/components/staff-stage-checklist";
import { ReportStageTracker } from "@/components/report-stage-tracker";
import { addFollowup, advanceReportStage, revertReportStage, updateReportStatus } from "@/app/staff/actions";
import { buildFollowupAuthorLabels } from "@/lib/reports/followup-labels";
import { BULLYING_TYPE_LABELS } from "@/lib/reports/bullying-types";
import type {
  AiAssessment,
  Profile,
  ReportBullyDetails,
  ReportConflictDetails,
  ReportFollowup,
  ReportStageProgress,
  StaffReportsView,
} from "@/types/database";

export default async function StaffReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile("staff");
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("staff_reports_view")
    .select("id, type, status, severity, is_anonymous, immediate_danger, created_at, description, visible_reporter_id")
    .eq("id", id)
    .single<StaffReportsView & { type: "bully" | "conflict" }>();

  if (!report) notFound();

  const [{ data: bully }, { data: conflict }, { data: followups }, { data: assessments }, reporterName] =
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

  // Table doesn't exist until supabase/migrations/0006_report_stage_progress.sql
  // has been run — hide the checklist rather than break the page.
  const { data: stageProgress, error: stageError } = await supabase
    .from("report_stage_progress")
    .select("*")
    .eq("report_id", id)
    .maybeSingle<ReportStageProgress>();
  if (stageError) console.error("[staff report detail] stage progress query failed", stageError);

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

  async function advanceStage(meetingDate?: string) {
    "use server";
    return advanceReportStage(id, meetingDate);
  }

  async function revertStage() {
    "use server";
    return revertReportStage(id);
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
              <p className="text-sm text-[var(--color-text-muted)]">{assessment.staff_summary}</p>
              {assessment.recommendation && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                  {assessment.recommendation.split("\n").map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {stageProgress && profile.is_handler && (
            <StaffStageChecklist
              reportId={id}
              progress={stageProgress}
              advanceStage={advanceStage}
              revertStage={revertStage}
            />
          )}

          {/* Teachers can see case progress but not act on it — only
              Handlers drive the checklist (see
              supabase/migrations/0010_handlers_and_teacher_tags.sql). */}
          {stageProgress && !profile.is_handler && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Case status</h2>
              <ReportStageTracker
                role="staff"
                reportId={id}
                reportCreatedAt={report.created_at}
                initialProgress={stageProgress}
              />
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
