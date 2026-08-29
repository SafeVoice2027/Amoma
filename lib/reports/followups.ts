"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/lib/auth";

// Shared by the Student, Staff, and Admin report-thread UIs. RLS on
// report_followups already restricts writes to people who can see the
// underlying report, so this stays a thin insert. Uses the request-memoized
// getCurrentProfile() rather than calling auth.getUser() directly — see the
// comment in lib/auth.ts for why that matters (refresh-token races).
export async function addFollowup(reportId: string, message: string, revalidateTo: string) {
  if (!message.trim()) return;

  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = await createClient();
  await supabase
    .from("report_followups")
    .insert({ report_id: reportId, author_id: profile.id, message: message.trim() });

  // Staff/Admin replying is what the student's notification bell surfaces —
  // a student's own messages in their own thread don't notify anyone.
  // `notifications` has no client-facing insert policy (server-role only),
  // so this goes through the service client.
  if (profile.role !== "student") {
    const { data: report } = await supabase.from("reports").select("reporter_id").eq("id", reportId).single();
    if (report?.reporter_id) {
      const service = createServiceClient();
      await service.from("notifications").insert({
        report_id: reportId,
        recipient_id: report.reporter_id,
        channel: "push",
        urgency: "normal",
        sent_at: new Date().toISOString(),
      });
    }
  }

  revalidatePath(revalidateTo);
}
