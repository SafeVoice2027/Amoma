import type { ReactNode } from "react";
import { Shield } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--color-primary-50)] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-600)] shadow-sm">
            <Shield className="h-7 w-7 text-white" strokeWidth={2} fill="none" />
          </div>
          <span className="text-2xl font-semibold tracking-tight text-[var(--color-primary-800)]">
            Amoma
          </span>
          <p className="mt-1 text-[var(--color-text-muted)]">Your voice. Safe and heard.</p>
        </div>

        {children}

        <div className="mt-6 text-center text-xs leading-5 text-[var(--color-text-muted)]">
          <p>Protected under RA 10173 — Data Privacy Act of 2012.</p>
          <p>Your identity is never shared with school staff.</p>
        </div>
      </div>
    </div>
  );
}
