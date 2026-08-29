import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { BugReportStatusSelect } from "@/components/bug-report-status-select";
import { updateBugReportStatus } from "@/app/admin/actions";
import type { BugReport, BugReportCategory, Profile } from "@/types/database";

const CATEGORY_LABELS: Record<BugReportCategory, string> = {
  login: "Trouble logging in",
  report_submission: "Problem submitting a report",
  notifications: "Notifications not working",
  app_bug: "Something in the app is broken",
  other: "Others",
};

type BugReportRow = Pick<
  BugReport,
  "id" | "category" | "other_category" | "description" | "status" | "created_at" | "reporter_id"
>;

export default async function AdminBugReportsPage() {
  await requireProfile("admin");
  const supabase = await createClient();

  const { data: bugReports, error } = await supabase
    .from("bug_reports")
    .select("id, category, other_category, description, status, created_at, reporter_id")
    .order("created_at", { ascending: false })
    .returns<BugReportRow[]>();

  if (error) {
    console.error("[admin bug-reports] query failed", error);
  }

  const rows = bugReports ?? [];
  const reporterIds = [...new Set(rows.map((r) => r.reporter_id))];
  const { data: reporterProfiles } = reporterIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, lrn")
        .in("id", reporterIds)
        .returns<Pick<Profile, "id" | "full_name" | "lrn">[]>()
    : { data: [] as Pick<Profile, "id" | "full_name" | "lrn">[] };
  const reporterInfo = new Map(
    (reporterProfiles ?? []).map((p) => [p.id, { name: p.full_name ?? "Student", lrn: p.lrn }]),
  );

  async function changeStatus(bugReportId: string, status: Parameters<typeof updateBugReportStatus>[1]) {
    "use server";
    await updateBugReportStatus(bugReportId, status);
  }

  return (
    <div>
      <PageHeader title="Bug reports" subtitle="Feedback submitted through the Help Hub, most recent first." />

      {error && (
        <Card className="mb-4 border-[var(--color-danger-600)]">
          <p className="text-sm text-[var(--color-danger-600)]">
            Couldn&apos;t load bug reports. If this is a fresh setup, make sure
            supabase/migrations/0003_add_bug_reports.sql has been run.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const reporter = reporterInfo.get(r.reporter_id);
          return (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {CATEGORY_LABELS[r.category]}
                    {r.category === "other" && r.other_category ? ` — ${r.other_category}` : ""}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {reporter?.name ?? "Student"}
                    {reporter?.lrn ? ` · LRN ${reporter.lrn}` : ""} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <BugReportStatusSelect status={r.status} onChange={changeStatus.bind(null, r.id)} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{r.description}</p>
            </Card>
          );
        })}
        {!rows.length && !error && (
          <Card>
            <p className="text-[var(--color-text-muted)]">No bug reports yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
