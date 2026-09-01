import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card } from "@/components/ui";
import { approveAccount, rejectAccount } from "@/app/admin/actions";
import { ApprovalRow } from "@/components/approval-row";
import { AdminCaseOverview } from "@/components/admin-case-overview";
import type { CaseRow } from "@/components/case-overview-table";
import { SeverityReportBoard } from "@/components/severity-report-board";
import { formatCaseId } from "@/lib/reports/case-id";
import type { Profile, StaffReportsView, UserRole } from "@/types/database";

type ReportRow = Pick<
  StaffReportsView,
  | "id"
  | "type"
  | "status"
  | "severity"
  | "category"
  | "is_anonymous"
  | "immediate_danger"
  | "assigned_staff_id"
  | "created_at"
  | "updated_at"
  | "visible_reporter_id"
>;

const RECENT_REPORTER_WINDOW_DAYS = 7;

// `category` was added to `reports` in a later migration
// (supabase/migrations/0002_add_report_category.sql). Until that migration
// has actually been run against the database, selecting it makes the whole
// query fail — which must never look like "there are no reports" to an
// admin. Retry once without `category` (treating it as unset) so real cases
// still show up even before the migration lands.
async function fetchReports(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("staff_reports_view")
    .select(
      "id, type, status, severity, category, is_anonymous, immediate_danger, assigned_staff_id, created_at, updated_at, visible_reporter_id",
    )
    .order("created_at", { ascending: false })
    .returns<ReportRow[]>();

  if (!error) return data ?? [];

  console.error("[admin] staff_reports_view query with category failed, retrying without it", error);

  const fallback = await supabase
    .from("staff_reports_view")
    .select(
      "id, type, status, severity, is_anonymous, immediate_danger, assigned_staff_id, created_at, updated_at, visible_reporter_id",
    )
    .order("created_at", { ascending: false })
    .returns<Omit<ReportRow, "category">[]>();

  if (fallback.error) {
    console.error("[admin] staff_reports_view fallback query also failed", fallback.error);
    return [];
  }

  return (fallback.data ?? []).map((r) => ({ ...r, category: null }));
}

// Purely mechanical, content-blind signal for staff awareness — counts how
// many reports the same reporter has filed recently. This is NOT a
// credibility or truthfulness judgment (nothing here reads report content);
// it's context a human can weigh however's appropriate, since a cluster of
// reports from one student could equally mean ongoing repeated bullying
// (which DO_s2026_006 treats as more serious) as anything else.
function countRecentReportsByReporter(reports: ReportRow[]): Map<string, number> {
  const windowStart = Date.now() - RECENT_REPORTER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const counts = new Map<string, number>();
  for (const r of reports) {
    if (!r.visible_reporter_id) continue;
    if (new Date(r.created_at).getTime() < windowStart) continue;
    counts.set(r.visible_reporter_id, (counts.get(r.visible_reporter_id) ?? 0) + 1);
  }
  return counts;
}

function computeStats(reports: ReportRow[]) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const openCases = reports.filter((r) => r.status === "unresolved").length;
  const inProgress = reports.filter((r) => r.status === "in_process").length;
  const resolved30d = reports.filter(
    (r) => r.status === "resolved" && new Date(r.updated_at).getTime() >= thirtyDaysAgo,
  ).length;

  const resolvedDurations = reports
    .filter((r) => r.status === "resolved")
    .map((r) => (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000));
  const avgResolutionDays = resolvedDurations.length
    ? resolvedDurations.reduce((sum, d) => sum + d, 0) / resolvedDurations.length
    : null;

  return { openCases, inProgress, resolved30d, avgResolutionDays };
}

export default async function AdminHomePage() {
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const [reportsResult, { data: school }, { data: pending }] = await Promise.all([
    fetchReports(supabase),
    profile.school_id
      ? supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle<{ name: string }>()
      : Promise.resolve({ data: null }),
    supabase
      .from("profiles")
      .select("id, full_name, role, lrn, deped_email, created_at")
      .eq("status", "pending")
      .in("role", ["staff", "student", "admin"] satisfies UserRole[])
      .order("created_at", { ascending: true })
      .returns<Pick<Profile, "id" | "full_name" | "role" | "lrn" | "deped_email" | "created_at">[]>(),
  ]);

  const allReports = reportsResult;

  const staffIds = [...new Set(allReports.map((r) => r.assigned_staff_id).filter((id): id is string => !!id))];
  const { data: staffProfiles } = staffIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", staffIds).returns<Pick<Profile, "id" | "full_name">[]>()
    : { data: [] as Pick<Profile, "id" | "full_name">[] };
  const staffNames = new Map((staffProfiles ?? []).map((s) => [s.id, s.full_name ?? "Staff member"]));

  const { openCases, inProgress, resolved30d, avgResolutionDays } = computeStats(allReports);
  const recentReporterCounts = countRecentReportsByReporter(allReports);

  const rows: CaseRow[] = allReports.map((r) => {
    const recentCount = r.visible_reporter_id ? recentReporterCounts.get(r.visible_reporter_id) : undefined;
    return {
      id: r.id,
      caseId: formatCaseId(r.id, r.created_at),
      category: r.category,
      status: r.status,
      flagged: r.immediate_danger,
      submittedAt: r.created_at,
      assignedName: r.assigned_staff_id ? (staffNames.get(r.assigned_staff_id) ?? "Staff member") : null,
      reporterRecentCount: recentCount && recentCount >= 2 ? recentCount : null,
    };
  });

  const statsSlot = (
    <>
      <StatCard label="Open cases" value={String(openCases)} />
      <StatCard label="In progress" value={String(inProgress)} />
      <StatCard label="Resolved (30d)" value={String(resolved30d)} valueClassName="text-green-400" />
      <StatCard
        label="Avg. resolution"
        value={avgResolutionDays === null ? "—" : `${avgResolutionDays.toFixed(1)} days`}
      />
    </>
  );

  const severityRows = allReports.map((r) => ({
    id: r.id,
    caseId: formatCaseId(r.id, r.created_at),
    type: r.type,
    status: r.status,
    severity: r.severity,
    isAnonymous: r.is_anonymous,
    createdAt: r.created_at,
  }));

  return (
    <div>
      <AdminCaseOverview schoolName={school?.name ?? "Your school"} statsSlot={statsSlot} rows={rows} />

      <h2 className="mb-4 mt-10 text-lg font-semibold">By severity</h2>
      <SeverityReportBoard rows={severityRows} hrefBase="/admin/reports" />

      <div className="mb-4 mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Account approvals</h2>
        <span className="text-sm text-[var(--color-text-muted)]">{pending?.length ?? 0} pending</span>
      </div>
      {!pending?.length ? (
        <Card>
          <p className="text-[var(--color-text-muted)]">No pending approvals.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <ApprovalRow key={p.id} profile={p} onApprove={approveAccount} onReject={rejectAccount} />
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-6">
        <Link href="/admin/reports">
          <span className="text-sm font-medium text-[var(--color-brand)]">View full report queue →</span>
        </Link>
        <Link href="/admin/bug-reports">
          <span className="text-sm font-medium text-[var(--color-brand)]">View bug reports →</span>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClassName}`}>{value}</p>
    </Card>
  );
}
