import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/(auth)/login/actions";
import { BottomNav } from "@/components/bottom-nav";
import { I18nProvider } from "@/components/i18n-provider";
import { getLanguage } from "@/lib/i18n/server";
import { FirstLoginPassword } from "@/components/first-login-password";
import { setLanguage, changeOwnPassword, setFirstPassword, keepSchoolPassword } from "@/app/student/actions";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile("student");
  const lang = await getLanguage();

  return (
    <I18nProvider lang={lang}>
      <div className="flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6 pb-24">{children}</main>
        {profile.must_choose_password && <FirstLoginPassword setPassword={setFirstPassword} keepPassword={keepSchoolPassword} />}
        <BottomNav fullName={profile.full_name ?? "Student"} onSignOut={logout} setLanguage={setLanguage} changePassword={changeOwnPassword} />
      </div>
    </I18nProvider>
  );
}
