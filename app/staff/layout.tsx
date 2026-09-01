import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/login/actions";
import { markUrgentNotificationsRead, markTeacherTagRead } from "@/app/staff/actions";
import { StaffHeader } from "@/components/staff-header";
import { fetchNotifications, buildUrgentNotificationItems } from "@/lib/notifications";
import { formatCaseId } from "@/lib/reports/case-id";
import type { ReportTeacherTag } from "@/types/database";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile("staff");
  const supabase = await createClient();

  const urgentNotifications = await fetchNotifications(supabase, profile.id, { urgency: "high" });
  const reportIds = [...new Set(urgentNotifications.map((n) => n.report_id).filter((id): id is string => !!id))];
  const { data: reports } = reportIds.length
    ? await supabase.from("reports").select("id, created_at").in("id", reportIds)
    : { data: [] as { id: string; created_at: string }[] };
  const reportsById = new Map((reports ?? []).map((r) => [r.id, r]));
  const urgentItems = buildUrgentNotificationItems(urgentNotifications, reportsById);
  const unreadUrgentCount = urgentNotifications.filter((n) => !n.read_at).length;

  // Mail inbox: reports an Admin has tagged this Teacher into. Only
  // meaningful for Teachers (is_handler = false) — Handlers already see
  // every report on their own dashboard.
  let tagItems: { id: string; reportId: string; caseId: string; note: string | null; createdAt: string; readAt: string | null }[] = [];
  if (!profile.is_handler) {
    const { data: tags, error: tagsError } = await supabase
      .from("report_teacher_tags")
      .select("*")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false })
      .returns<ReportTeacherTag[]>();
    // Table doesn't exist until supabase/migrations/0010_handlers_and_teacher_tags.sql
    // has been run — hide the mail icon rather than break the layout.
    if (tagsError) console.error("[staff layout] teacher tags query failed", tagsError);

    const tagReportIds = [...new Set((tags ?? []).map((t) => t.report_id))];
    const { data: tagReports } = tagReportIds.length
      ? await supabase.from("reports").select("id, created_at").in("id", tagReportIds)
      : { data: [] as { id: string; created_at: string }[] };
    const tagReportsById = new Map((tagReports ?? []).map((r) => [r.id, r]));

    tagItems = (tags ?? [])
      .filter((t) => tagReportsById.has(t.report_id))
      .map((t) => ({
        id: t.id,
        reportId: t.report_id,
        caseId: formatCaseId(t.report_id, tagReportsById.get(t.report_id)!.created_at),
        note: t.note,
        createdAt: t.created_at,
        readAt: t.read_at,
      }));
  }

  return (
    <div className="control-shell flex flex-1 flex-col bg-[var(--color-background)]">
      <StaffHeader
        fullName={profile.full_name ?? "Staff"}
        onSignOut={logout}
        urgentItems={urgentItems}
        unreadUrgentCount={unreadUrgentCount}
        markUrgentRead={markUrgentNotificationsRead}
        tagItems={tagItems}
        markTagRead={markTeacherTagRead}
        showMail={!profile.is_handler}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
