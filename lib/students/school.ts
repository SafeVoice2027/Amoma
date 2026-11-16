import type { createServiceClient } from "@/lib/supabase/service";
import type { Profile } from "@/types/database";

// The one school a person may import students into: their own. The Developer
// has no school of their own, so they get the first school. Kept out of the
// "use server" actions file so it can't be called from the browser.
export async function schoolForImporter(
  service: ReturnType<typeof createServiceClient>,
  importer: Profile,
): Promise<{ id: string; name: string } | null> {
  const query = service.from("schools").select("id, name");
  const { data } = importer.school_id
    ? await query.eq("id", importer.school_id).maybeSingle<{ id: string; name: string }>()
    : await query.order("created_at", { ascending: true }).limit(1).maybeSingle<{ id: string; name: string }>();
  return data ?? null;
}
