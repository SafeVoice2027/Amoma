import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, PageHeader, SeverityBadge } from "@/components/ui";
import { ReportStageTracker } from "@/components/report-stage-tracker";
import { formatCaseId } from "@/lib/reports/case-id";
import type { Report, ReportStageProgress } from "@/types/database";

type ReportRow = Pick<Report, "id" | "type" | "status" | "severity" | "created_at" | "description">;

export default async function StudentReportStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile("student");
  const supabase = await createClient();

  // RLS already restricts this to the student's own reports (reporter_id =
  // auth.uid()) — a foreign or made-up id just comes back empty, same as a
  // genuinely missing one.
  const { data: report } = await supabase
    .from("reports")
    .select("id, type, status, severity, created_at, description")
    .eq("id", id)
    .eq("reporter_id", profile.id)
    .maybeSingle<ReportRow>();

  if (!report) notFound();

  const { data: stageProgress } = await supabase
    .from("report_stage_progress")
    .select("*")
    .eq("report_id", id)
    .maybeSingle<ReportStageProgress>();

  // Clears this report's exclamation mark and count in the "Report status"
  // bell — viewing the page IS "seeing" the update. RPC doesn't exist until
  // supabase/migrations/0007_stage_progress_seen.sql has been run; ignore
  // that failure rather than breaking the page over a read-tracking write.
  if (stageProgress) {
    const { error: seenError } = await supabase.rpc("mark_report_status_seen", { p_report_id: id });
    if (seenError) console.error("[student report status] mark_report_status_seen failed", seenError);
  }

  const caseId = formatCaseId(report.id, report.created_at);

  return (
    <div className="mx-auto w-full max-w-xl">
      <Link
        href="/student"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <PageHeader title="Report status" subtitle={`${report.type === "bully" ? "Bully" : "Conflict"} · ${caseId}`} />

      <div className="mb-6 flex items-center gap-3">
        <SeverityBadge severity={report.severity} />
        <span className="text-sm text-[var(--color-text-muted)]">
          Submitted {new Date(report.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {report.description && (
        <Card className="mb-6">
          <p className="text-sm text-[var(--color-text-muted)]">{report.description}</p>
        </Card>
      )}

      <Card>
        {stageProgress ? (
          <ReportStageTracker
            role="student"
            reportId={report.id}
            reportCreatedAt={report.created_at}
            initialProgress={stageProgress}
          />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Status tracking isn&apos;t available for this report yet.
          </p>
        )}
      </Card>
    </div>
  );
}
