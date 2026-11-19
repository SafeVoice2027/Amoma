import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrHandler } from "@/lib/auth";
import { Card } from "@/components/ui";
import { AdminCaseOverview } from "@/components/admin-case-overview";
import type { CaseRow } from "@/components/case-overview-table";
import { SeverityReportBoard } from "@/components/severity-report-board";
import { formatReference } from "@/lib/reports/case-id";
import { fetchUnreadReportIds } from "@/lib/reports/unread";
import { TypeFileBrowser } from "@/components/type-file-browser";
import type { ReportTypeFile, StaffReportsView } from "@/types/database";

type ReportRow = Pick<
  StaffReportsView,
  | "id"
  | "type"
  | "status"
  | "severity"
  | "category"
  | "is_anonymous"
  | "immediate_danger"
  | "created_at"
  | "updated_at"
  | "visible_reporter_id"
  | "case_year"
  | "case_seq"
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
      "id, type, status, severity, category, is_anonymous, immediate_danger, created_at, updated_at, visible_reporter_id, case_year, case_seq",
    )
    .order("created_at", { ascending: false })
    .returns<ReportRow[]>();

  if (!error) return data ?? [];

  console.error("[admin] staff_reports_view query with category failed, retrying without it", error);

  const fallback = await supabase
    .from("staff_reports_view")
    .select(
      "id, type, status, severity, is_anonymous, immediate_danger, created_at, updated_at, visible_reporter_id",
    )
    .order("created_at", { ascending: false })
    .returns<Omit<ReportRow, "category" | "case_year" | "case_seq">[]>();

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
  const profile = await requireAdminOrHandler();
  const isAdmin = profile.role === "admin";
  // Re-exported at app/developer/(protected)/page.tsx too — see
  // lib/supabase/middleware.ts for why isAdmin and "reached via /developer"
  // are always the same thing.
  const basePath = isAdmin ? "/developer" : "/admin";
  const supabase = await createClient();

  // (Account requests are decided on the Accounts page, not here.)
  const [reportsResult, { data: school }] = await Promise.all([
    fetchReports(supabase),
    profile.school_id
      ? supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle<{ name: string }>()
      : Promise.resolve({ data: null }),
  ]);

  const allReports = reportsResult;

  const { data: typeFiles, error: typeFilesError } = await supabase
    .from("report_type_files")
    .select("*")
    .returns<ReportTypeFile[]>();
  if (typeFilesError) console.error("[admin overview] report_type_files query failed", typeFilesError);

  const unreadIds = await fetchUnreadReportIds(supabase, profile);

  const { openCases, inProgress, resolved30d, avgResolutionDays } = computeStats(allReports);
  const recentReporterCounts = countRecentReportsByReporter(allReports);

  const rows: CaseRow[] = allReports.map((r) => {
    const recentCount = r.visible_reporter_id ? recentReporterCounts.get(r.visible_reporter_id) : undefined;
    return {
      id: r.id,
      caseId: formatReference(r.id, r.created_at, r.status, undefined, r),
      category: r.category,
      status: r.status,
      flagged: r.immediate_danger,
      submittedAt: r.created_at,
      unread: unreadIds.has(r.id),
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
    caseId: formatReference(r.id, r.created_at, r.status, undefined, r),
    type: r.type,
    status: r.status,
    severity: r.severity,
    isAnonymous: r.is_anonymous,
    createdAt: r.created_at,
    unread: unreadIds.has(r.id),
  }));

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <AdminCaseOverview
          schoolName={school?.name ?? "Your school"}
          statsSlot={statsSlot}
          rows={rows}
          hrefBase={basePath}
        />

        <div className="xl:sticky xl:top-8">
          <h2 className="mb-4 text-lg font-semibold">By severity</h2>
          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
            <SeverityReportBoard rows={severityRows} hrefBase={`${basePath}/reports`} />
          </div>
        </div>
      </div>

      <div className="mt-10">
        <TypeFileBrowser rows={typeFiles ?? []} reportHrefBase={`${basePath}/reports`} />
      </div>

      <div className="mt-10 flex flex-wrap gap-6">
        <Link href={`${basePath}/reports`}>
          <span className="text-sm font-medium text-[var(--color-brand)]">View full report queue →</span>
        </Link>
        {isAdmin && (
          <Link href="/developer/bug-reports">
            <span className="text-sm font-medium text-[var(--color-brand)]">View bug reports →</span>
          </Link>
        )}
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
