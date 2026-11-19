import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/ui";
import { AccountList } from "@/components/account-list";
import { ApprovalRow } from "@/components/approval-row";
import { SwitchedOffAccounts } from "@/components/switched-off-accounts";
import { Card } from "@/components/ui";
import { canManageAdmins, getAccountManager } from "@/lib/accounts/manager";
import {
  approveAccount,
  rejectAccount,
  changeUserPassword,
  toggleIsHandler,
  setEmployeeNumber,
  setAdminPosition,
  setStudentEnrollment,
  switchStudentBackOn,
} from "@/app/admin/actions";
import type { Sf1Status } from "@/components/account-row";
import type { Profile, UserRole } from "@/types/database";

type AccountProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "role"
  | "lrn"
  | "deped_email"
  | "is_handler"
  | "employee_number"
  | "admin_position"
  | "school_id"
  | "grade_level"
  | "section"
  | "last_in_sf1_at"
  | "sf1_confirmed_at"
>;

// Shared by the Developer (every school) and each school's Admins (their own
// school only — the school is taken from their own profile, never from the
// request). What an Admin can do on this page depends on their position; see
// lib/accounts/manager.ts.
export default async function AccountsPage() {
  const manager = await getAccountManager();
  if (!manager) redirect("/login");

  let query = createServiceClient()
    .from("profiles")
    .select(
      "id, full_name, role, lrn, deped_email, is_handler, employee_number, admin_position, school_id, grade_level, section, last_in_sf1_at, sf1_confirmed_at",
    )
    .eq("status", "approved")
    .in("role", ["staff", "student"] satisfies UserRole[])
    .order("full_name", { ascending: true });
  if (!manager.isDeveloper) query = query.eq("school_id", manager.profile.school_id!);

  const { data, error } = await query.returns<AccountProfile[]>();
  if (error) console.error("[accounts page] query failed", error);
  const rows = data ?? [];

  // Each school's latest SF1 import = the newest stamp among its students. A
  // student is "missing" when they have a grade, weren't in that import, and
  // nobody has said they're still enrolled since.
  const latestBySchool = new Map<string, string>();
  for (const r of rows) {
    if (r.role === "student" && r.school_id && r.last_in_sf1_at) {
      const cur = latestBySchool.get(r.school_id);
      if (!cur || r.last_in_sf1_at > cur) latestBySchool.set(r.school_id, r.last_in_sf1_at);
    }
  }
  const sf1Status = (r: AccountProfile): Sf1Status => {
    if (r.role !== "student") return "none";
    const latest = r.school_id ? latestBySchool.get(r.school_id) : undefined;
    if (!latest || r.grade_level == null) return "none";
    if (r.last_in_sf1_at && r.last_in_sf1_at >= latest) return "in";
    if (r.sf1_confirmed_at && r.sf1_confirmed_at >= latest) return "confirmed";
    return "missing";
  };
  const accounts = rows.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    role: r.role,
    lrn: r.lrn,
    deped_email: r.deped_email,
    is_handler: r.is_handler,
    employee_number: r.employee_number,
    admin_position: r.admin_position,
    grade_level: r.grade_level ?? null,
    section: r.section ?? null,
    sf1: sf1Status(r),
  }));

  const manageAdmins = canManageAdmins(manager);

  // Switched-off students (graduated / transferred), newest first.
  let offQuery = createServiceClient()
    .from("profiles")
    .select("id, lrn, grade_level, section, deactivated_reason, deactivated_at")
    .eq("role", "student")
    .eq("status", "suspended")
    .not("lrn", "is", null)
    .order("deactivated_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (!manager.isDeveloper) offQuery = offQuery.eq("school_id", manager.profile.school_id!);
  const { data: offData } = await offQuery.returns<
    {
      id: string;
      lrn: string;
      grade_level: number | null;
      section: string | null;
      deactivated_reason: string | null;
      deactivated_at: string | null;
    }[]
  >();
  const switchedOff = (offData ?? []).map((r) => ({
    id: r.id,
    lrn: r.lrn,
    grade: r.grade_level,
    section: r.section,
    reason: r.deactivated_reason,
    at: r.deactivated_at,
  }));

  // Account requests: the Developer decides every school's; a school's LFO
  // decides their own school's staff requests. Other Admins don't see this.
  let pendingQuery = createServiceClient()
    .from("profiles")
    .select("id, full_name, role, lrn, deped_email, employee_number, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  pendingQuery = manager.isDeveloper
    ? pendingQuery.in("role", ["staff", "student", "admin"] satisfies UserRole[])
    : pendingQuery.eq("role", "staff").eq("school_id", manager.profile.school_id!);
  const { data: pendingData } = manageAdmins
    ? await pendingQuery.returns<
        Pick<Profile, "id" | "full_name" | "role" | "lrn" | "deped_email" | "employee_number" | "created_at">[]
      >()
    : { data: [] };
  const pending = pendingData ?? [];

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={
          manageAdmins
            ? "Set a new password for a student or staff member who's locked out, and choose who is an Admin. There's no self-service reset."
            : "Set a new password for a student or teacher who's locked out. There's no self-service reset."
        }
      />
      {manageAdmins && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pending approval</h2>
            <span className="text-sm text-[var(--color-text-muted)]">{pending.length} pending</span>
          </div>
          {pending.length === 0 ? (
            <Card>
              <p className="text-[var(--color-text-muted)]">No pending approvals.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <ApprovalRow key={p.id} profile={p} onApprove={approveAccount} onReject={rejectAccount} />
              ))}
            </div>
          )}
        </section>
      )}

      <h2 className="mb-3 text-lg font-semibold">Approved accounts</h2>
      <AccountList
        accounts={accounts}
        viewerId={manager.profile.id}
        canManageAdmins={manageAdmins}
        onChangePassword={changeUserPassword}
        onToggleHandler={toggleIsHandler}
        onSetEmployeeNumber={setEmployeeNumber}
        onSetAdminPosition={setAdminPosition}
        onSetEnrollment={setStudentEnrollment}
      />

      <SwitchedOffAccounts students={switchedOff} switchOn={switchStudentBackOn} />
    </div>
  );
}
