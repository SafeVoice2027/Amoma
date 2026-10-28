import type { SupabaseClient } from "@supabase/supabase-js";

// "Unread" reports for one Admin / Developer: filed after their account's
// `unread_since` and not yet opened by them (a row in report_reads). See
// supabase/migrations/0031_report_unread_tracking.sql. Until that migration has
// run, or if either query fails, nothing is reported as unread — the dashboard
// simply shows no red dots rather than breaking.
export async function fetchUnreadReportIds(
  supabase: SupabaseClient,
  profile: { id: string; unread_since?: string | null },
): Promise<Set<string>> {
  if (!profile.unread_since) return new Set();

  const { data: recent, error } = await supabase.from("reports").select("id").gt("created_at", profile.unread_since);
  if (error || !recent?.length) return new Set();

  const ids = recent.map((r: { id: string }) => r.id);
  const { data: reads, error: readsError } = await supabase
    .from("report_reads")
    .select("report_id")
    .eq("profile_id", profile.id)
    .in("report_id", ids);
  if (readsError) return new Set();

  const read = new Set((reads ?? []).map((r: { report_id: string }) => r.report_id));
  return new Set(ids.filter((id: string) => !read.has(id)));
}

// Opening a report's page marks it read for the person opening it.
export async function markReportRead(supabase: SupabaseClient, profileId: string, reportId: string): Promise<void> {
  const { error } = await supabase
    .from("report_reads")
    .upsert({ profile_id: profileId, report_id: reportId }, { onConflict: "profile_id,report_id", ignoreDuplicates: true });
  // Table doesn't exist until 0031 has been run — nothing to do about that here.
  if (error) console.error("[markReportRead] failed", error.message);
}
