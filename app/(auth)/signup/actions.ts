"use server";

import { createServiceClient } from "@/lib/supabase/service";
import type { UserRole } from "@/types/database";

export type SignupState = { error: string | null; success: boolean; autoApproved?: boolean };

function emailForSignup(role: UserRole, identifier: string) {
  if (role === "student") return `${identifier}@lrn.safevoice.internal`;
  // A Handler signing up via Employee Number (see
  // supabase/migrations/0013_staff_roster.sql) has no DepEd email — same
  // synthetic-address pattern as the student LRN case above.
  if (role === "staff" && !identifier.includes("@")) return `${identifier}@employee.safevoice.internal`;
  return identifier;
}

// Amoma serves a single school for now, so every account is assigned to
// whichever one row exists in `schools` — no school picker in the UI. If
// this ever becomes multi-school, this is the one place to change.
async function getDefaultSchool(service: ReturnType<typeof createServiceClient>) {
  const { data } = await service
    .from("schools")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data;
}

// Anyone can request an account, but every new profile starts as
// status = 'pending' — nobody can sign in (middleware + RLS both gate on
// 'approved') until an Admin approves them from the Admin dashboard.
// Uses the service-role client to create a pre-confirmed auth user directly,
// so this works the same way for synthetic student LRN emails (which have no
// real inbox to confirm) as it does for real staff/admin DepEd emails.
export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const role = formData.get("role") as UserRole;
  // Students aren't asked for a name at all — collecting one at signup would
  // undercut the anonymity every other part of the app promises them.
  // Staff/admin are real school personnel using a real email, so a name is
  // still required for them.
  const fullName = String(formData.get("full_name") ?? "").trim();
  const identifier = String(formData.get("identifier") ?? "").trim();

  if (!role || !identifier || (role !== "student" && !fullName)) {
    return { error: "Please fill in every field.", success: false };
  }
  if (role === "student" && !/^\d{6,}$/.test(identifier)) {
    return { error: "Please enter a valid LRN (numbers only).", success: false };
  }
  // Staff can sign up with either a DepEd email (Teachers, Handlers) or an
  // Employee Number (Handlers only — see supabase/migrations/0013_staff_roster.sql).
  // Admin has no Employee Number path and still requires a real email.
  const isEmployeeNumberSignup = role === "staff" && !identifier.includes("@");
  if (role === "admin" && !identifier.includes("@")) {
    return { error: "Please enter a valid DepEd email address.", success: false };
  }
  if (isEmployeeNumberSignup && identifier.length < 4) {
    return { error: "Please enter a valid DepEd email address or Employee Number.", success: false };
  }

  const service = createServiceClient();

  const school = await getDefaultSchool(service);
  if (!school) {
    return { error: "No school has been configured yet. Contact your system administrator.", success: false };
  }

  // Every role — including students, logging in with their LRN — chooses
  // their own password at signup.
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  if (!password) {
    return { error: "Please fill in every field.", success: false };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match.", success: false };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", success: false };
  }

  const email = emailForSignup(role, identifier);

  // A student whose LRN is on the school's known roster (see
  // supabase/migrations/0011_student_roster.sql), or a staff signup whose
  // Employee Number is on the staff roster (see
  // supabase/migrations/0013_staff_roster.sql), skips the pending queue —
  // Admin only needs to review signups neither roster recognizes.
  let autoApproved = false;
  let isHandler = false;
  if (role === "student") {
    const { data: rosterEntry } = await service
      .from("student_roster")
      .select("lrn")
      .eq("lrn", identifier)
      .maybeSingle();
    autoApproved = !!rosterEntry;
  } else if (isEmployeeNumberSignup) {
    const { data: rosterEntry, error: rosterError } = await service
      .from("staff_roster")
      .select("employee_number")
      .eq("employee_number", identifier)
      .maybeSingle();
    // Table doesn't exist until supabase/migrations/0013_staff_roster.sql
    // has been run — fall through to the normal pending queue rather than
    // failing the signup outright.
    if (rosterError) console.error("[signup] staff_roster query failed", rosterError);
    autoApproved = !!rosterEntry;
    isHandler = autoApproved;
  }

  const { data: created, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !created.user) {
    const message = authError?.message.includes("already been registered")
      ? "An account with that LRN or email already exists."
      : "We couldn't create your account right now. Please try again.";
    return { error: message, success: false };
  }

  const { error: profileError } = await service.from("profiles").insert({
    id: created.user.id,
    role,
    full_name: role === "student" ? null : fullName,
    lrn: role === "student" ? identifier : null,
    deped_email: role !== "student" && !isEmployeeNumberSignup ? identifier : null,
    employee_number: isEmployeeNumberSignup ? identifier : null,
    is_handler: isHandler,
    school_id: school.id,
    status: autoApproved ? "approved" : "pending",
    approved_at: autoApproved ? new Date().toISOString() : null,
  });

  if (profileError) {
    await service.auth.admin.deleteUser(created.user.id);
    const message = profileError.code === "23505" ? "An account with that LRN or email already exists." : "We couldn't create your account right now. Please try again.";
    return { error: message, success: false };
  }

  return { error: null, success: true, autoApproved };
}
