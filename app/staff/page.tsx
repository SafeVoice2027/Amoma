import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { summarizeUnresolved } from "@/lib/ai/summary";
import { Card, PageHeader, SeverityBadge, StatusBadge } from "@/components/ui";
import type { ReportFollowup, SeverityLevel, StaffReportsView } from "@/types/database";

type ReportRow = Pick<
  StaffReportsView,
  "id" | "type" | "status" | "severity" | "is_anonymous" | "created_at"
>;

const SEVERITY_ORDER: (SeverityLevel | null)[] = ["critical", "serious", "less_serious", "minor", null];
const SEVERITY_TITLES: Record<string, string> = {
  critical: "Critical — needs immediate attention",
  serious: "Serious",
  less_serious: "Less serious",
  minor: "Minor",
  null: "Pending AI review",
};

export default async function StaffHomePage() {
  const profile = await requireProfile("staff");
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("staff_reports_view")
    .select("id, type, status, severity, is_anonymous, created_at")
    .order("created_at", { ascending: false })
    .returns<ReportRow[]>();

  const reportIds = (reports ?? []).map((r) => r.id);
  const { data: followups } = reportIds.length
    ? await supabase
        .from("report_followups")
        .select("report_id")
        .in("report_id", reportIds)
        .returns<Pick<ReportFollowup, "report_id">[]>()
    : { data: [] as Pick<ReportFollowup, "report_id">[] };

  const rows = (reports ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    severity: r.severity,
    isAnonymous: r.is_anonymous,
    createdAt: r.created_at,
    followupCount: (followups ?? []).filter((f) => f.report_id === r.id).length,
  }));

  const summary = await summarizeUnresolved(
    rows.map((r) => ({
      id: r.id,
      status: r.status,
      severity: r.severity,
      createdAt: r.createdAt,
      followupCount: r.followupCount,
    })),
  );

  const counts = {
    resolved: rows.filter((r) => r.status === "resolved").length,
    in_process: rows.filter((r) => r.status === "in_process").length,
    unresolved: rows.filter((r) => r.status === "unresolved").length,
  };

  return (
    <div>
      <PageHeader
        title={`Welcome, ${(profile.full_name ?? "there").split(" ")[0]}`}
        subtitle="Here's what needs your attention."
      />

      <Card className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Why cases are stuck
        </h2>
        <p className="mt-2 text-[var(--color-text)]">{summary}</p>
      </Card>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <TrendTile label="Resolved" value={counts.resolved} />
        <TrendTile label="In process" value={counts.in_process} />
        <TrendTile label="Unresolved" value={counts.unresolved} />
      </div>

      {SEVERITY_ORDER.map((severity) => {
        const group = rows.filter((r) => r.severity === severity);
        if (group.length === 0) return null;
        return (
          <div key={severity ?? "null"} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">{SEVERITY_TITLES[severity ?? "null"]}</h2>
            <div className="space-y-3">
              {group.map((r) => (
                <Link key={r.id} href={`/staff/reports/${r.id}`}>
                  <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
                    <div>
                      <p className="font-medium">
                        {r.type === "bully" ? "Bullying report" : "Conflict report"}
                        {r.isAnonymous && (
                          <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                            Anonymous
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {new Date(r.createdAt).toLocaleString()} · {r.followupCount} follow-up message
                        {r.followupCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <SeverityBadge severity={r.severity} />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {rows.length === 0 && (
        <Card>
          <p className="text-[var(--color-text-muted)]">No reports yet for your school.</p>
        </Card>
      )}
    </div>
  );
}

function TrendTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="text-center">
      <p className="text-2xl font-semibold text-[var(--color-brand)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{label}</p>
    </Card>
  );
}
