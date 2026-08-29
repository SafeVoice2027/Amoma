"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";
import { login, type LoginState } from "@/app/(auth)/login/actions";

const initialState: LoginState = { error: null };

// Deliberately not linked from the shared /login page or anywhere else in
// the UI — students and staff have no reason to know this route exists.
// The real access control is still the role check in proxy.ts/RLS; this is
// purely about not advertising an admin entry point to the general public.
export default function AdminLoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<Card className="min-h-[20rem]"> </Card>}>
        <AdminLoginForm />
      </Suspense>
    </AuthShell>
  );
}

function AdminLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(login, initialState);
  const next = useSearchParams().get("next") ?? "";

  return (
    <Card className="!p-4">
      <h1 className="text-lg font-semibold">School Administrator Log In</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Log in with your school administrator credentials.
      </p>

      <form action={formAction} className="mt-3 space-y-2">
        <input type="hidden" name="role" value="admin" />
        <input type="hidden" name="next" value={next} />

        <div>
          <label htmlFor="identifier" className="mb-1 block text-sm font-medium">
            Staff Email Address
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              <Mail size={18} />
            </span>
            <input
              id="identifier"
              name="identifier"
              type="email"
              placeholder="you@deped.gov.ph"
              required
              autoComplete="username"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-base outline-none focus:border-[var(--color-brand)]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              <Lock size={18} />
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-10 text-base outline-none focus:border-[var(--color-brand)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="text-right">
          <Link href="/forgot-password" className="text-sm font-medium text-[var(--color-brand)]">
            Forgot Password?
          </Link>
        </div>

        {state.error && (
          <p className="rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]">
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </Card>
  );
}
