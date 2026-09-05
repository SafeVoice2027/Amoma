import Link from "next/link";
import { AlertTriangle, User, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ReportsList } from "@/components/reports-list";
import { TrendChart } from "@/components/trend-chart";
import { NotificationBell, type NotificationItem } from "@/components/notification-bell";
import { ReportStatusBell, type ReportStatusItem } from "@/components/report-status-bell";
import { addFollowup, markAllNotificationsRead } from "@/app/student/actions";
import { formatCaseId } from "@/lib/reports/case-id";
import { fetchNotifications } from "@/lib/notifications";
import { hasStageUpdate } from "@/lib/reports/stage-labels";
import type { Report, ReportFollowup, ReportStageProgress } from "@/types/database";

type ReportRow = Pick<
  Report,
  "id" | "type" | "status" | "severity" | "is_anonymous" | "created_at" | "description"
>;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function StudentHomePage() {
  const profile = await requireProfile("student");
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, type, status, severity, is_anonymous, created_at, description")
    .eq("reporter_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<ReportRow[]>();

  const reportIds = (reports ?? []).map((r) => r.id);
  const { data: followups } = reportIds.length
    ? await supabase
        .from("report_followups")
        .select("*")
        .in("report_id", reportIds)
        .order("created_at", { ascending: true })
        .returns<ReportFollowup[]>()
    : { data: [] as ReportFollowup[] };

  // Table doesn't exist until supabase/migrations/0006_report_stage_progress.sql
  // has been run — hide the tracker rather than break the page.
  const { data: stageProgressRows, error: stageError } = reportIds.length
    ? await supabase.from("report_stage_progress").select("*").in("report_id", reportIds).returns<ReportStageProgress[]>()
    : { data: [] as ReportStageProgress[], error: null };
  if (stageError) console.error("[student] stage progress query failed", stageError);
  const stageProgressByReport = new Map((stageProgressRows ?? []).map((p) => [p.report_id, p]));

  const summaries = (reports ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    severity: r.severity,
    is_anonymous: r.is_anonymous,
    created_at: r.created_at,
    summary: r.description ?? "",
    followups: (followups ?? []).filter((f) => f.report_id === r.id),
    stageProgress: stageProgressByReport.get(r.id) ?? null,
  }));

  const caseIds = Object.fromEntries(
    (reports ?? []).map((r) => [r.id, formatCaseId(r.id, r.created_at)]),
  );
  const reportTypes = Object.fromEntries((reports ?? []).map((r) => [r.id, r.type]));

  const reportStatusItems: ReportStatusItem[] = summaries
    .filter((s): s is typeof s & { stageProgress: NonNullable<typeof s.stageProgress> } => s.stageProgress !== null)
    .map((s) => ({
      id: s.id,
      caseId: caseIds[s.id],
      reportType: s.type,
      currentStage: s.stageProgress.current_stage,
      closed: s.stageProgress.current_stage === "case_closed" && s.stageProgress.case_closed_at !== null,
      hasUpdate: hasStageUpdate(s.stageProgress),
    }));
  const statusUpdateCount = reportStatusItems.filter((item) => item.hasUpdate).length;

  const notifications = await fetchNotifications(supabase, profile.id);

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const notificationItems: NotificationItem[] = notifications
    .filter((n): n is typeof n & { report_id: string } => !!n.report_id && !!caseIds[n.report_id])
    .map((n) => {
      const reportFollowups = (followups ?? []).filter((f) => f.report_id === n.report_id);
      const latest = reportFollowups[reportFollowups.length - 1];
      return {
        id: n.id,
        reportId: n.report_id,
        caseId: caseIds[n.report_id],
        reportType: reportTypes[n.report_id],
        preview: latest?.message ?? "Your counselor replied to your report.",
        createdAt: n.created_at,
      };
    });

  // Reports This Month, bucketed into simple 7-day chunks starting from the
  // 1st (Week 1 = days 1-7, Week 2 = 8-14, ...) rather than calendar weeks —
  // avoids a partial first/last week and keeps every bucket's width uniform.
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil(daysInMonth / 7);
  const days = Array.from({ length: weekCount }, (_, i) => {
    const startDay = i * 7 + 1;
    const endDay = Math.min(startDay + 6, daysInMonth);
    const rangeStart = new Date(year, month, startDay, 0, 0, 0, 0);
    const rangeEnd = new Date(year, month, endDay, 23, 59, 59, 999);
    const inRange = (d: Date) => d >= rangeStart && d <= rangeEnd;
    return {
      label: `Wk ${i + 1}`,
      bully: (reports ?? []).filter((r) => r.type === "bully" && inRange(new Date(r.created_at))).length,
    };
  });
  const statusCounts = {
    resolved: summaries.filter((s) => s.status === "resolved").length,
    in_process: summaries.filter((s) => s.status === "in_process").length,
    unresolved: summaries.filter((s) => s.status === "unresolved").length,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
            <User size={18} />
          </span>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">{greeting()}</p>
            <p className="text-sm font-semibold">Anonymous Student</p>
          </div>
        </div>
        <div className="flex items-center">
          <ReportStatusBell items={reportStatusItems} unreadCount={statusUpdateCount} />
          <NotificationBell items={notificationItems} unreadCount={unreadCount} markAllRead={markAllNotificationsRead} />
        </div>
      </div>

      <div className="mb-8 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/amoma-logo.png" alt="Amoma" className="h-28 w-auto" />
      </div>

      <h1 className="text-center text-lg font-semibold">What would you like to report?</h1>
      <p className="mt-1 text-center text-sm text-[var(--color-text-muted)]">
        Your report is anonymous. We&apos;re here to help.
      </p>

      <div className="mt-6 space-y-4">
        <Link
          href="/student/report/bully"
          className="block rounded-2xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[var(--color-primary-800)]">Bully</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Repeated harmful behavior targeting someone
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--color-primary-700)]">Tap to report →</p>
            </div>
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-white">
              <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      </div>

      <div className="mt-10">
        <ReportsList
          reports={summaries}
          caseIds={caseIds}
          currentUserId={profile.id}
          sendMessage={addFollowup}
        />
      </div>

      <div className="mt-10">
        <TrendChart days={days} statusCounts={statusCounts} />
      </div>
    </div>
  );
}
