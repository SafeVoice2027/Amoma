import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { summarizeUnresolved } from "@/lib/ai/summary";
import { StaffTeacherHome } from "@/components/staff-teacher-home";
import { StaffHandlerHome } from "@/components/staff-handler-home";
import { formatCaseId } from "@/lib/reports/case-id";
import type { ReportFollowup, StaffReportsView } from "@/types/database";

type ReportRow = Pick<
  StaffReportsView,
  "id" | "type" | "status" | "severity" | "is_anonymous" | "created_at"
>;

export default async function StaffHomePage() {
  const profile = await requireProfile("staff");
  const supabase = await createClient();

  const [{ data: reports }, { data: school }] = await Promise.all([
    supabase
      .from("staff_reports_view")
      .select("id, type, status, severity, is_anonymous, created_at")
      .order("created_at", { ascending: false })
      .returns<ReportRow[]>(),
    profile.school_id
      ? supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle<{ name: string }>()
      : Promise.resolve({ data: null }),
  ]);

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

  const counts = {
    resolved: rows.filter((r) => r.status === "resolved").length,
    in_process: rows.filter((r) => r.status === "in_process").length,
    unresolved: rows.filter((r) => r.status === "unresolved").length,
  };

  const firstName = (profile.full_name ?? "there").split(" ")[0];

  // Page A (Teacher) vs. Page B (Handler) — see
  // supabase/migrations/0010_handlers_and_teacher_tags.sql.
  if (!profile.is_handler) {
    const summary = await summarizeUnresolved(
      rows.map((r) => ({
        id: r.id,
        status: r.status,
        severity: r.severity,
        createdAt: r.createdAt,
        followupCount: r.followupCount,
      })),
    );
    return <StaffTeacherHome firstName={firstName} summary={summary} counts={counts} rows={rows} />;
  }

  const boardRows = rows.map((r) => ({
    id: r.id,
    caseId: formatCaseId(r.id, r.createdAt),
    type: r.type,
    status: r.status,
    severity: r.severity,
    isAnonymous: r.isAnonymous,
    createdAt: r.createdAt,
  }));

  return (
    <StaffHandlerHome
      firstName={firstName}
      schoolName={school?.name ?? "Your school"}
      counts={counts}
      rows={boardRows}
    />
  );
}
