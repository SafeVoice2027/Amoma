import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { AccountList } from "@/components/account-list";
import { changeUserPassword } from "@/app/admin/actions";
import type { Profile, UserRole } from "@/types/database";

export default async function AdminAccountsPage() {
  await requireProfile("admin");
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("profiles")
    .select("id, full_name, role, lrn, deped_email")
    .eq("status", "approved")
    .in("role", ["staff", "student"] satisfies UserRole[])
    .order("full_name", { ascending: true })
    .returns<Pick<Profile, "id" | "full_name" | "role" | "lrn" | "deped_email">[]>();

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Set a new password for a student or staff member who's locked out — there's no self-service reset."
      />
      <AccountList accounts={accounts ?? []} onChangePassword={changeUserPassword} />
    </div>
  );
}
