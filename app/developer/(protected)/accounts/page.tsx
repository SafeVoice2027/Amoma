import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { AccountList } from "@/components/account-list";
import { changeUserPassword, toggleIsHandler, setEmployeeNumber } from "@/app/admin/actions";
import type { Profile, UserRole } from "@/types/database";

type AccountProfile = Pick<
  Profile,
  "id" | "full_name" | "role" | "lrn" | "deped_email" | "is_handler" | "employee_number"
>;

// is_handler/employee_number don't exist until
// supabase/migrations/0010_handlers_and_teacher_tags.sql has been run —
// selecting them unconditionally fails the whole query. Retry without them
// (defaulting is_handler false, employee_number null) so the page still
// works, same defensive pattern as fetchReports() in app/admin/page.tsx.
async function fetchAccounts(supabase: Awaited<ReturnType<typeof createClient>>): Promise<AccountProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, lrn, deped_email, is_handler, employee_number")
    .eq("status", "approved")
    .in("role", ["staff", "student"] satisfies UserRole[])
    .order("full_name", { ascending: true })
    .returns<AccountProfile[]>();

  if (!error) return data ?? [];

  console.error("[admin accounts] query with is_handler/employee_number failed, retrying without them", error);

  const fallback = await supabase
    .from("profiles")
    .select("id, full_name, role, lrn, deped_email")
    .eq("status", "approved")
    .in("role", ["staff", "student"] satisfies UserRole[])
    .order("full_name", { ascending: true })
    .returns<Omit<AccountProfile, "is_handler" | "employee_number">[]>();

  if (fallback.error) {
    console.error("[admin accounts] fallback query also failed", fallback.error);
    return [];
  }

  return (fallback.data ?? []).map((a) => ({ ...a, is_handler: false, employee_number: null }));
}

export default async function AdminAccountsPage() {
  await requireProfile("admin");
  const supabase = await createClient();

  const accounts = await fetchAccounts(supabase);

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Set a new password for a student or staff member who's locked out — there's no self-service reset."
      />
      <AccountList
        accounts={accounts}
        onChangePassword={changeUserPassword}
        onToggleHandler={toggleIsHandler}
        onSetEmployeeNumber={setEmployeeNumber}
      />
    </div>
  );
}
