import type { ReactNode } from "react";
import { requireAdminOrHandler } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/login/actions";
import { markUrgentNotificationsRead } from "@/app/admin/actions";
import { AdminSidebar } from "@/components/admin-sidebar";
import { fetchNotifications, buildUrgentNotificationItems } from "@/lib/notifications";
import { formatCaseId } from "@/lib/reports/case-id";
import type { Profile, ReportTeacherTag } from "@/types/database";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdminOrHandler();
  const supabase = await createClient();

  const urgentNotifications = await fetchNotifications(supabase, profile.id, { urgency: "high" });
  const reportIds = [...new Set(urgentNotifications.map((n) => n.report_id).filter((id): id is string => !!id))];
  const { data: reports } = reportIds.length
    ? await supabase.from("reports").select("id, created_at").in("id", reportIds)
    : { data: [] as { id: string; created_at: string }[] };
  const reportsById = new Map((reports ?? []).map((r) => [r.id, r]));
  const urgentItems = buildUrgentNotificationItems(urgentNotifications, reportsById);
  const unreadUrgentCount = urgentNotifications.filter((n) => !n.read_at).length;

  // Sent-tag history: every teacher tag any Admin has sent, school-wide.
  // Table doesn't exist until supabase/migrations/0010_handlers_and_teacher_tags.sql
  // has been run — hide the mail icon rather than break the layout.
  const { data: tags, error: tagsError } = await supabase
    .from("report_teacher_tags")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ReportTeacherTag[]>();
  if (tagsError) console.error("[admin layout] teacher tags query failed", tagsError);

  const tagReportIds = [...new Set((tags ?? []).map((t) => t.report_id))];
  const teacherIds = [...new Set((tags ?? []).map((t) => t.teacher_id))];
  const [{ data: tagReports }, { data: teacherProfiles }] = await Promise.all([
    tagReportIds.length
      ? supabase.from("reports").select("id, created_at").in("id", tagReportIds)
      : Promise.resolve({ data: [] as { id: string; created_at: string }[] }),
    teacherIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", teacherIds).returns<Pick<Profile, "id" | "full_name">[]>()
      : Promise.resolve({ data: [] as Pick<Profile, "id" | "full_name">[] }),
  ]);
  const tagReportsById = new Map((tagReports ?? []).map((r) => [r.id, r]));
  const teacherNamesById = new Map((teacherProfiles ?? []).map((t) => [t.id, t.full_name ?? "Staff member"]));

  const tagItems = (tags ?? [])
    .filter((t) => tagReportsById.has(t.report_id))
    .map((t) => ({
      id: t.id,
      reportId: t.report_id,
      caseId: formatCaseId(t.report_id, tagReportsById.get(t.report_id)!.created_at),
      note: t.note,
      createdAt: t.created_at,
      readAt: t.read_at,
      teacherName: teacherNamesById.get(t.teacher_id) ?? "Staff member",
    }));

  return (
    <div className="control-shell flex flex-1 bg-[var(--color-background)]">
      <AdminSidebar
        fullName={profile.full_name ?? "Admin"}
        isAdmin={profile.role === "admin"}
        onSignOut={logout}
        urgentItems={urgentItems}
        unreadUrgentCount={unreadUrgentCount}
        markUrgentRead={markUrgentNotificationsRead}
        tagItems={tagItems}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
