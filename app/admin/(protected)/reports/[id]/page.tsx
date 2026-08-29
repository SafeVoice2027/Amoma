import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, PageHeader, SeverityBadge, StatusBadge } from "@/components/ui";
import { FollowupPanel } from "@/components/followup-panel";
import { StatusSelect } from "@/components/status-select";
import { RevealIdentity } from "@/components/reveal-identity";
import { CATEGORY_LABELS, CATEGORY_STYLES } from "@/components/case-overview-table";
import { ReportStageTracker } from "@/components/report-stage-tracker";
import { addFollowup, revealIdentity, updateReportStatus } from "@/app/admin/actions";
import { buildFollowupAuthorLabels } from "@/lib/reports/followup-labels";
import type {
  AiAssessment,
  Profile,
  Report,
  ReportBullyDetails,
  ReportConflictDetails,
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
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const report = await fetchReport(supabase, id);

  if (!report) notFound();

  const [{ data: bully }, { data: conflict }, { data: followups }, { count: recentReportCount }, { data: assessments }] =
    await Promise.all([
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
    ]);

  const assessment = assessments?.[0] ?? null;

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
  const authorLabels = buildFollowupAuthorLabels({
    followups: followups ?? [],
    authorProfiles: authorProfiles ?? [],
    currentUserId: profile.id,
    isAnonymous: report.is_anonymous,
    viewerRole: "admin",
  });

  async function sendMessage(message: string) {
    "use server";
    await addFollowup(id, message);
  }

  async function changeStatus(status: Parameters<typeof updateReportStatus>[1]) {
    "use server";
    await updateReportStatus(id, status);
  }

  async function reveal(reason: string, notes: string) {
    "use server";
    return revealIdentity(id, reason, notes);
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
          {report.is_anonymous && <RevealIdentity reveal={reveal} />}
          <StatusSelect status={report.status} onChange={changeStatus} />
        </div>
      </div>

      {stageProgress && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Case status</h2>
          <ReportStageTracker
            role="admin"
            reportId={report.id}
            reportCreatedAt={report.created_at}
            initialProgress={stageProgress}
          />
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Report details</h2>
            <dl className="space-y-3 text-sm">
              <Field label="Description" value={report.description ?? "—"} />
              {bully && (
                <>
                  <Field label="Who was involved" value={bully.offender_description ?? "—"} />
                  <Field label="Location" value={bully.location ?? "—"} />
                </>
              )}
              {conflict && (
                <Field label="Dominating / escalating" value={conflict.dominant_party_description ?? "—"} />
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
