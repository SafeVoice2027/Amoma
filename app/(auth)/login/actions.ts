"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  student: "/student",
  staff: "/staff",
  admin: "/admin",
};

// Students authenticate with their LRN, but Supabase Auth identifies accounts
// by email. Admin-provisioned student accounts use this synthetic address as
// their Supabase Auth email so the LRN itself is never treated as a secret
// or exposed outside the school's own systems.
function emailForLogin(role: UserRole, identifier: string) {
  if (role === "student") return `${identifier}@lrn.safevoice.internal`;
  return identifier;
}

export type LoginState = { error: string | null };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const role = formData.get("role") as UserRole;
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!role || !identifier || !password) {
    return { error: "Please fill in every field." };
  }

  const supabase = await createClient();

  // Teachers log in with their Employee Number instead of a DepEd email —
  // resolve it to the real sign-in email first via a SECURITY DEFINER RPC
  // (see supabase/migrations/0010_handlers_and_teacher_tags.sql). Anything
  // that looks like an email (Handlers, Students via LRN below) skips this
  // lookup entirely.
  let loginEmail = emailForLogin(role, identifier);
  if (role === "staff" && !identifier.includes("@")) {
    const { data: resolvedEmail, error: lookupError } = await supabase.rpc(
      "get_login_email_by_employee_number",
      { p_employee_number: identifier },
    );
    if (lookupError || !resolvedEmail) {
      return { error: "That login didn't work. Double-check your details and try again." };
    }
    loginEmail = resolvedEmail;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  });

  if (error || !data.user) {
    return { error: "That login didn't work. Double-check your details and try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.role !== role) {
    await supabase.auth.signOut();
    return { error: "That login didn't work. Double-check your details and try again." };
  }

  if (profile.status !== "approved") {
    redirect("/pending-approval");
  }

  redirect(next && next.startsWith("/") ? next : ROLE_HOME[role]);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
