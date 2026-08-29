import type { createClient } from "@/lib/supabase/server";
import { formatCaseId } from "@/lib/reports/case-id";
import type { NotificationRow } from "@/types/database";

export type NotificationRowPick = Pick<NotificationRow, "id" | "report_id" | "created_at" | "read_at" | "urgency">;

// `read_at` doesn't exist until supabase/migrations/0005_add_notification_read_at.sql
// has been run — retry without it (treating every notification as unread)
// rather than letting the whole page fail, same defensive pattern as
// fetchReports() in app/admin/page.tsx for the `category` column.
export async function fetchNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipientId: string,
  opts: { urgency?: NotificationRow["urgency"]; limit?: number } = {},
): Promise<NotificationRowPick[]> {
  const limit = opts.limit ?? 20;

  let query = supabase
    .from("notifications")
    .select("id, report_id, created_at, read_at, urgency")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.urgency) query = query.eq("urgency", opts.urgency);

  const { data, error } = await query.returns<NotificationRowPick[]>();
  if (!error) return data ?? [];

  console.error("[notifications] query with read_at failed, retrying without it", error);

  let fallbackQuery = supabase
    .from("notifications")
    .select("id, report_id, created_at, urgency")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.urgency) fallbackQuery = fallbackQuery.eq("urgency", opts.urgency);

  const fallback = await fallbackQuery.returns<Omit<NotificationRowPick, "read_at">[]>();
  if (fallback.error) {
    console.error("[notifications] fallback query also failed", fallback.error);
    return [];
  }

  return (fallback.data ?? []).map((n) => ({ ...n, read_at: null }));
}

// Shared by the Staff and Admin layouts to turn raw notification rows into
// display items for UrgentNotificationBell — needs each notification's
// report's own created_at (not the notification's) for a correct case ID.
export function buildUrgentNotificationItems(
  notifications: NotificationRowPick[],
  reportsById: Map<string, { created_at: string }>,
): { id: string; reportId: string; caseId: string; createdAt: string }[] {
  return notifications
    .filter((n): n is NotificationRowPick & { report_id: string } => !!n.report_id && reportsById.has(n.report_id))
    .map((n) => ({
      id: n.id,
      reportId: n.report_id,
      caseId: formatCaseId(n.report_id, reportsById.get(n.report_id)!.created_at),
      createdAt: n.created_at,
    }));
}
