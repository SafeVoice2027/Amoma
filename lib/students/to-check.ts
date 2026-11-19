import { createServiceClient } from "@/lib/supabase/service";

export interface StudentToCheck {
  lrn: string;
  grade: number | null;
  section: string | null;
}

// Students who were NOT in the school's latest SF1 import and haven't been
// answered yet. "Latest import" = the newest last_in_sf1_at at the school. A
// student is listed when they have a recorded grade, are still active, were
// last seen in an older register (or none), and nobody has confirmed them as
// "still enrolled" since that latest import. Kept out of the "use server"
// actions file so it can't be called from the browser.
export async function listStudentsToCheck(
  schoolId: string,
): Promise<{ students: StudentToCheck[]; latestImportAt: string | null }> {
  const service = createServiceClient();

  const { data: latestRow } = await service
    .from("profiles")
    .select("last_in_sf1_at")
    .eq("role", "student")
    .eq("school_id", schoolId)
    .not("last_in_sf1_at", "is", null)
    .order("last_in_sf1_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ last_in_sf1_at: string }>();
  const latest = latestRow?.last_in_sf1_at ?? null;
  if (!latest) return { students: [], latestImportAt: null };

  const students: StudentToCheck[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await service
      .from("profiles")
      .select("lrn, grade_level, section")
      .eq("role", "student")
      .eq("school_id", schoolId)
      .eq("status", "approved")
      .not("lrn", "is", null)
      .not("grade_level", "is", null)
      .or(`last_in_sf1_at.is.null,last_in_sf1_at.lt.${latest}`)
      .or(`sf1_confirmed_at.is.null,sf1_confirmed_at.lt.${latest}`)
      .order("grade_level", { ascending: false })
      .order("lrn", { ascending: true })
      .range(from, from + 999);
    for (const r of (data ?? []) as { lrn: string; grade_level: number | null; section: string | null }[]) {
      students.push({ lrn: r.lrn, grade: r.grade_level, section: r.section });
    }
    if (!data || data.length < 1000) break;
  }
  return { students, latestImportAt: latest };
}
