import { Card, PageHeader } from "@/components/ui";
import { SeverityReportBoard, type SeverityBoardRow } from "@/components/severity-report-board";

// Page B (Handler): functionally the same shape as the Admin case-overview
// dashboard, minus the bug-report queue and account-approval queue (those
// stay Admin-only) — see supabase/migrations/0010_handlers_and_teacher_tags.sql.
export function StaffHandlerHome({
  firstName,
  schoolName,
  counts,
  rows,
}: {
  firstName: string;
  schoolName: string;
  counts: { resolved: number; in_process: number; unresolved: number };
  rows: SeverityBoardRow[];
}) {
  return (
    <div>
      <PageHeader title={`Welcome, ${firstName}`} subtitle={schoolName} />

      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatTile label="Unresolved" value={counts.unresolved} />
        <StatTile label="In process" value={counts.in_process} />
        <StatTile label="Resolved" value={counts.resolved} valueClassName="text-green-400" />
      </div>

      <SeverityReportBoard rows={rows} hrefBase="/staff/reports" />
    </div>
  );
}

function StatTile({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <Card className="text-center">
      <p className={`text-2xl font-semibold ${valueClassName || "text-[var(--color-brand)]"}`}>{value}</p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{label}</p>
    </Card>
  );
}
