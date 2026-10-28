import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrHandler } from "@/lib/auth";
import { Card, PageHeader, SeverityBadge, StatusBadge } from "@/components/ui";
import { FollowupPanel } from "@/components/followup-panel";
import { EvidenceField } from "@/components/evidence-field";
import { StatusSelect } from "@/components/status-select";
import { RevealIdentity } from "@/components/reveal-identity";
import { CATEGORY_LABELS, CATEGORY_STYLES } from "@/components/case-overview-table";
import { StaffStageChecklist } from "@/components/staff-stage-checklist";
import { addFollowup, revealIdentity, updateReportStatus } from "@/app/admin/actions";
import { advanceReportStage, revertReportStage } from "@/lib/reports/stage-progress";
import { buildFollowupAuthorLabels } from "@/lib/reports/followup-labels";
import { BULLYING_TYPE_LABELS, describeTypeDetails, formatSetting } from "@/lib/reports/bullying-types";
import type {
  AiAssessment,
  Profile,
  Report,
  ReportBullyDetails,
  ReportConflictDetails,
  ReportEvidence,
  ReportFollowup,
  ReportStageProgress,
} from "@/types/database";

// Must match RECENT_REPORTER_WINDOW_DAYS in app/admin/page.tsx, so the count
// shown here agrees with the one shown on the Case Overview table.
const RECENT_REPORTER_WINDOW_DAYS = 7;

function recentWindowStartIso(): string {
  return new Date(Date.now() - RECENT_REPORTER_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// `category` doesn't exist on `reports` until
// supabase/migrations/0002_add_report_category.sql has actually been run.
// Selecting it unconditionally made this ENTIRE query fail on an
// unmigrated database — and since only `data` was destructured (silently
// dropping `error`), that failure looked identical to "no such report" and
// 404'd every report detail page. Same defensive retry as fetchReports() in
// app/admin/page.tsx.
async function fetchReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<Report | null> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, type, status, severity, category, is_anonymous, immediate_danger, created_at, description, reporter_id",
    )
    .eq("id", id)
    .single<Report>();

  if (!error) return data;

  console.error("[admin report detail] query with category failed, retrying without it", error);

  const fallback = await supabase
    .from("reports")
    .select("id, type, status, severity, is_anonymous, immediate_danger, created_at, description, reporter_id")
    .eq("id", id)
    .single<Omit<Report, "category">>();

  if (fallback.error) {
    console.error("[admin report detail] fallback query also failed", fallback.error);
    return null;
  }

  return { ...fallback.data, category: null };
}

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireAdminOrHandler();
  const isAdmin = profile.role === "admin";
  // Re-exported at app/developer/(protected)/reports/[id]/page.tsx too.
  const basePath = isAdmin ? "/developer" : "/admin";
  const supabase = await createClient();

  const report = await fetchReport(supabase, id);

  if (!report) notFound();

  const [
    { data: bully },
    { data: conflict },
    { data: followups },
    { count: recentReportCount },
    { data: assessments },
    { data: evidence },
  ] = await Promise.all([
    supabase.from("report_bully_details").select("*").eq("report_id", id).maybeSingle<ReportBullyDetails>(),
    supabase.from("report_conflict_details").select("*").eq("report_id", id).maybeSingle<ReportConflictDetails>(),
    supabase
      .from("report_followups")
      .select("*")
      .eq("report_id", id)
      .order("created_at", { ascending: true })
      .returns<ReportFollowup[]>(),
    // Purely mechanical, content-blind count for staff awareness — not a
    // credibility judgment. See the comment on countRecentReportsByReporter
    // in app/admin/page.tsx for why this stays neutral by design.
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", report.reporter_id)
      .gte("created_at", recentWindowStartIso()),
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
  // has been run — hide the tracker rather than break the page.
  const { data: stageProgress, error: stageError } = await supabase
    .from("report_stage_progress")
    .select("*")
    .eq("report_id", id)
    .maybeSingle<ReportStageProgress>();
  if (stageError) console.error("[admin report detail] stage progress query failed", stageError);

  const authorIds = [...new Set((followups ?? []).map((f) => f.author_id))];
  const { data: authorProfiles } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", authorIds)
        .returns<Pick<Profile, "id" | "full_name" | "role">[]>()
    : { data: [] as Pick<Profile, "id" | "full_name" | "role">[] };
  // A Handler is role='staff' underneath, not 'admin' — the anonymous
  // reporter's name must still be masked for them exactly as it would be
  // on the Staff report detail page, so this can't be hardcoded to "admin"
  // now that this page isn't Admin-exclusive (see buildFollowupAuthorLabels).
  const authorLabels = buildFollowupAuthorLabels({
    followups: followups ?? [],
    authorProfiles: authorProfiles ?? [],
    currentUserId: profile.id,
    isAnonymous: report.is_anonymous,
    viewerRole: profile.role,
  });

  async function sendMessage(message: string) {
    "use server";
    await addFollowup(id, message, basePath);
  }

  async function changeStatus(status: Parameters<typeof updateReportStatus>[1]) {
    "use server";
    await updateReportStatus(id, status, basePath);
  }

  async function reveal(reason: string, notes: string) {
    "use server";
    return revealIdentity(id, reason, notes);
  }

  async function advanceStage() {
    "use server";
    return advanceReportStage(id, `${basePath}/reports/${id}`);
  }

  async function revertStage() {
    "use server";
    return revertReportStage(id, `${basePath}/reports/${id}`);
  }

  return (
    <div>
      <PageHeader
        title={report.type === "bully" ? "Bullying report" : "Conflict report"}
        subtitle={`Submitted ${new Date(report.created_at).toLocaleString()}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SeverityBadge severity={report.severity} />
        <StatusBadge status={report.status} />
        {report.category && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${CATEGORY_STYLES[report.category]}`}
          >
            {CATEGORY_LABELS[report.category]}
          </span>
        )}
        {report.immediate_danger && (
          <span className="rounded-full bg-[var(--color-danger-100)] px-3 py-1 text-sm font-medium text-[var(--color-danger-700)]">
            Flagged immediate danger
          </span>
        )}
        {recentReportCount !== null && recentReportCount >= 2 && (
          <span
            className="rounded-full bg-[var(--color-background)] px-3 py-1 text-sm font-medium text-[var(--color-text-muted)]"
            title="A mechanical count, not a credibility judgment — repeated reports can also mean ongoing bullying."
          >
            {recentReportCount} reports from this student in the past {RECENT_REPORTER_WINDOW_DAYS} days
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {/* Identity disclosure stays Admin-only — it's the one exception
              to "Handlers see practically the same view", since it's the
              app's single most sensitive action against a student's
              anonymity and is already a formally logged, reason-justified
              flow (see revealIdentity() in app/admin/actions.ts). */}
          {report.is_anonymous && isAdmin && <RevealIdentity reveal={reveal} />}
          <StatusSelect status={report.status} onChange={changeStatus} />
        </div>
      </div>

      {/* Admin (Learner Formation Officer / School Head) and Developer drive the
          same interactive checklist. */}
      {stageProgress && (
        <div className="mb-6">
          <StaffStageChecklist
            reportId={id}
            progress={stageProgress}
            advanceStage={advanceStage}
            revertStage={revertStage}
          />
        </div>
      )}

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
                  {describeTypeDetails(bully.type_details).map((d) => (
                    <Field key={d.type} label={`${d.label} — ${d.prompt}`} value={d.answer} />
                  ))}
                  <Field label="Victim" value={bully.victim_grade_section ?? "—"} />
                  <Field
                    label="Oppressor"
                    value={[bully.oppressor_grade_section, bully.oppressor_name].filter(Boolean).join(" · ") || "—"}
                  />
                  {bully.incident_date || bully.incident_time || bully.incident_place ? (
                    <>
                      <Field label="Date" value={formatSetting(bully.incident_date ?? "", "", "") || "—"} />
                      <Field label="Time" value={formatSetting("", bully.incident_time ?? "", "") || "—"} />
                      <Field label="Place" value={bully.incident_place ?? "—"} />
                    </>
                  ) : (
                    <Field label="Setting" value={bully.setting ?? "—"} />
                  )}
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
              <EvidenceField items={evidenceLinks} />
            </dl>
          </Card>

          {assessment && (
            <Card>
              <h2 className="mb-3 text-lg font-semibold">AI assessment</h2>
              <dl className="space-y-3 text-sm">
                <Field label="Report content" value={report.description ?? "—"} />
                <Field label="People involved" value={peopleInvolved} />
                <Field label="Setting" value={settingValue} />
                <EvidenceField items={evidenceLinks} />
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
