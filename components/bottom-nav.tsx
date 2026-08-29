"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Info, Settings, LogOut, ShieldCheck, HelpCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function BottomNav({
  fullName,
  onSignOut,
}: {
  fullName: string;
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [panel, setPanel] = useState<"info" | "settings" | null>(null);
  const isHome = pathname === "/student";

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      {panel && (
        <div className="absolute bottom-16 w-full max-w-xs rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg">
          {panel === "info" ? (
            <div className="flex items-start gap-2 text-sm">
              <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-[var(--color-primary-600)]" />
              <p className="text-[var(--color-text-muted)]">
                Protected under RA 10173 — Data Privacy Act of 2012. Your identity is never shared
                with school staff.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">{fullName}</p>

              <div className="mt-3">
                <ThemeToggle />
              </div>

              <Link
                href="/student/help"
                onClick={() => setPanel(null)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-background)]"
              >
                <HelpCircle size={16} />
                Help Hub
              </Link>

              <form action={onSignOut} className="mt-3">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-background)]"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <nav className="flex items-center gap-2 rounded-full bg-[var(--color-neutral-900)] px-4 py-2.5 shadow-lg">
        <Link
          href="/student"
          onClick={() => setPanel(null)}
          aria-label="Home"
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            isHome ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]" : "text-neutral-300"
          }`}
        >
          <Home size={18} />
        </Link>
        <button
          type="button"
          aria-label="Info"
          onClick={() => setPanel((p) => (p === "info" ? null : "info"))}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            panel === "info" ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]" : "text-neutral-300"
          }`}
        >
          <Info size={18} />
        </button>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => setPanel((p) => (p === "settings" ? null : "settings"))}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            panel === "settings" ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]" : "text-neutral-300"
          }`}
        >
          <Settings size={18} />
        </button>
      </nav>
    </div>
  );
}
