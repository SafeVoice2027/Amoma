import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

// "admin" here is the real superuser role, branded "Developer" throughout
// the UI and routed to its own /developer/* tree — see lib/supabase/middleware.ts.
const ROLE_HOME: Record<UserRole, string> = {
  student: "/student",
  staff: "/staff",
  admin: "/developer",
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, is_handler")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.status !== "approved") redirect("/pending-approval");

  // A Handler's home is /admin, not /staff — see
  // app/(auth)/login/actions.ts for the same special case.
  const roleHome = profile.role === "staff" && profile.is_handler ? "/admin" : ROLE_HOME[profile.role as UserRole];
  redirect(roleHome);
}
