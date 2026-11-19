import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/ui";
import { AccountList } from "@/components/account-list";
import { canManageAdmins, getAccountManager } from "@/lib/accounts/manager";
import { changeUserPassword, toggleIsHandler, setEmployeeNumber, setAdminPosition } from "@/app/admin/actions";
import type { Profile, UserRole } from "@/types/database";

type AccountProfile = Pick<
  Profile,
  "id" | "full_name" | "role" | "lrn" | "deped_email" | "is_handler" | "employee_number" | "admin_position"
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
    .select("id, full_name, role, lrn, deped_email, is_handler, employee_number, admin_position")
    .eq("status", "approved")
    .in("role", ["staff", "student"] satisfies UserRole[])
    .order("full_name", { ascending: true });
  if (!manager.isDeveloper) query = query.eq("school_id", manager.profile.school_id!);

  const { data, error } = await query.returns<AccountProfile[]>();
  if (error) console.error("[accounts page] query failed", error);
  const accounts = data ?? [];

  const manageAdmins = canManageAdmins(manager);

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
      <AccountList
        accounts={accounts}
        viewerId={manager.profile.id}
        canManageAdmins={manageAdmins}
        onChangePassword={changeUserPassword}
        onToggleHandler={toggleIsHandler}
        onSetEmployeeNumber={setEmployeeNumber}
        onSetAdminPosition={setAdminPosition}
      />
    </div>
  );
}
