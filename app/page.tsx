import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  student: "/student",
  staff: "/staff",
  admin: "/admin",
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.status !== "approved") redirect("/pending-approval");

  redirect(ROLE_HOME[profile.role as UserRole]);
}
