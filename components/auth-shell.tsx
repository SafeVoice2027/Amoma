import type { ReactNode } from "react";
import { Shield } from "lucide-react";

// Shared chrome for every unauthenticated auth screen (login, signup,
// forgot-password, and the standalone admin login). Sized to fit a typical
// viewport without scrolling — min-h-dvh (not a fixed height) still lets a
// genuinely short viewport or the longest tab (Student, with its extra PIN
// info box) grow and scroll normally rather than clipping content.
export function AuthShell({ children, footerNote }: { children: ReactNode; footerNote?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-[var(--color-primary-50)] px-4 py-4">
      <div className="w-full max-w-md">
        <div className="mb-3 flex flex-col items-center text-center">
          <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-600)] shadow-sm">
            <Shield className="h-5 w-5 text-white" strokeWidth={2} fill="none" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[var(--color-primary-800)]">Amoma</span>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Your voice. Safe and heard.</p>
        </div>

        {children}

        <div className="mt-3 text-center text-xs leading-5 text-[var(--color-text-muted)]">
          <p>Protected under RA 10173 — Data Privacy Act of 2012.</p>
          {footerNote}
        </div>
      </div>
    </div>
  );
}
