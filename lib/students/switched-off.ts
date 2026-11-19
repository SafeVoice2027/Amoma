import { createServiceClient } from "@/lib/supabase/service";

export interface SwitchedOffStudent {
  lrn: string;
  grade: number | null;
  section: string | null;
  reason: string | null;
  at: string | null;
}

// The school's switched-off student accounts, newest first. Kept out of the
// "use server" actions file so it can't be called from the browser.
export async function listSwitchedOffStudents(schoolId: string): Promise<SwitchedOffStudent[]> {
  const { data } = await createServiceClient()
    .from("profiles")
    .select("lrn, grade_level, section, deactivated_reason, deactivated_at")
    .eq("role", "student")
    .eq("school_id", schoolId)
    .eq("status", "suspended")
    .not("lrn", "is", null)
    .order("deactivated_at", { ascending: false, nullsFirst: false })
    .limit(500);

  return ((data ?? []) as {
    lrn: string;
    grade_level: number | null;
    section: string | null;
    deactivated_reason: string | null;
    deactivated_at: string | null;
  }[]).map((r) => ({
    lrn: r.lrn,
    grade: r.grade_level,
    section: r.section,
    reason: r.deactivated_reason,
    at: r.deactivated_at,
  }));
}
