"use client";

import Link from "next/link";
import { HelpCircle, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AccountSettingsPanel({
  name,
  roleLabel,
  helpHubHref,
  onSignOut,
  onNavigate,
}: {
  name: string;
  // Admin and Handler now share the same /admin pages (see
  // supabase/migrations/0010_handlers_and_teacher_tags.sql) with nothing
  // else in that UI to tell them apart — this is the one place that says
  // which one you're actually signed in as.
  roleLabel?: string;
  helpHubHref?: string;
  onSignOut: () => Promise<void>;
  onNavigate?: () => void;
}) {
  return (
    <div className="w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg">
      <p className="text-sm font-medium">{name}</p>
      {roleLabel && <p className="text-xs text-[var(--color-text-muted)]">{roleLabel}</p>}

      <div className="mt-3">
        <ThemeToggle />
      </div>

      {helpHubHref && (
        <Link
          href={helpHubHref}
          onClick={onNavigate}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-background)]"
        >
          <HelpCircle size={16} />
          Help Hub
        </Link>
      )}

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
  );
}
