import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/(auth)/login/actions";
import { BottomNav } from "@/components/bottom-nav";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile("student");

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6 pb-24">{children}</main>
      <BottomNav fullName={profile.full_name ?? "Student"} onSignOut={logout} />
    </div>
  );
}
