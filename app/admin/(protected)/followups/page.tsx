import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrHandler } from "@/lib/auth";
import { Card, PageHeader, SeverityBadge } from "@/components/ui";
import { formatCaseId } from "@/lib/reports/case-id";
import type { Profile, Report, ReportFollowup } from "@/types/database";

type FollowupRow = Pick<ReportFollowup, "id" | "report_id" | "message" | "author_id" | "created_at">;
type ReportRow = Pick<Report, "id" | "type" | "severity" | "is_anonymous" | "created_at">;

export default async function AdminFollowupsPage() {
  await requireAdminOrHandler();
  const supabase = await createClient();

  const { data: followups } = await supabase
    .from("report_followups")
    .select("id, report_id, message, author_id, created_at")
    .order("created_at", { ascending: false })
    .returns<FollowupRow[]>();

  // Keep only the most recent follow-up per report — that's what determines
  // this list's sort order and preview text.
  const latestByReport = new Map<string, FollowupRow>();
  for (const f of followups ?? []) {
    if (!latestByReport.has(f.report_id)) latestByReport.set(f.report_id, f);
  }

  const reportIds = [...latestByReport.keys()];
  const { data: reports } = reportIds.length
    ? await supabase
        .from("reports")
        .select("id, type, severity, is_anonymous, created_at")
        .in("id", reportIds)
        .returns<ReportRow[]>()
    : { data: [] as ReportRow[] };
  const reportsById = new Map((reports ?? []).map((r) => [r.id, r]));

  const authorIds = [...new Set([...latestByReport.values()].map((f) => f.author_id))];
  const { data: authors } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds)
        .returns<Pick<Profile, "id" | "full_name">[]>()
    : { data: [] as Pick<Profile, "id" | "full_name">[] };
  const authorNames = new Map((authors ?? []).map((a) => [a.id, a.full_name ?? "Someone"]));

  const rows = reportIds
    .map((id) => ({ report: reportsById.get(id), followup: latestByReport.get(id)! }))
    .filter((r): r is { report: ReportRow; followup: FollowupRow } => !!r.report)
    .sort((a, b) => new Date(b.followup.created_at).getTime() - new Date(a.followup.created_at).getTime());

  return (
    <div>
      <PageHeader title="Followups" subtitle="Reports with the most recent follow-up activity, most recent first." />
      <div className="space-y-3">
        {rows.map(({ report, followup }) => (
          <Link key={report.id} href={`/admin/reports/${report.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {report.type === "bully" ? "Bullying report" : "Conflict report"}
                    {report.is_anonymous && (
                      <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">Anonymous</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {formatCaseId(report.id, report.created_at)}
                  </p>
                </div>
                <SeverityBadge severity={report.severity} />
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {authorNames.get(followup.author_id) ?? "Someone"} ·{" "}
                {new Date(followup.created_at).toLocaleString()}
              </p>
              <p className="mt-1 truncate text-sm">{followup.message}</p>
            </Card>
          </Link>
        ))}
        {!rows.length && (
          <Card>
            <p className="text-[var(--color-text-muted)]">No follow-up activity yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
