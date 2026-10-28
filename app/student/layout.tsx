import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/(auth)/login/actions";
import { BottomNav } from "@/components/bottom-nav";
import { I18nProvider } from "@/components/i18n-provider";
import { getLanguage } from "@/lib/i18n/server";
import { setLanguage } from "@/app/student/actions";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile("student");
  const lang = await getLanguage();

  return (
    <I18nProvider lang={lang}>
      <div className="flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6 pb-24">{children}</main>
        <BottomNav fullName={profile.full_name ?? "Student"} onSignOut={logout} setLanguage={setLanguage} />
      </div>
    </I18nProvider>
  );
}
