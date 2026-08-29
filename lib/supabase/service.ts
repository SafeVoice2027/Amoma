import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for privileged, server-only writes (AI assessment
// results, system notifications, admin user creation). Bypasses RLS — never
// import this from a Client Component and never expose
// SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
