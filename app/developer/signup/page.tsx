"use client";

import { useActionState } from "react";
import Link from "next/link";
import { User, Mail, Lock } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";
import { signup, type SignupState } from "@/app/(auth)/signup/actions";

const initialState: SignupState = { error: null, success: false };

// Deliberately not linked from anywhere in the UI — same reasoning as
// /developer/login. Share this URL directly with whoever should actually be
// requesting a developer account.
export default function DeveloperSignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  if (state.success) {
    return (
      <AuthShell>
        <Card>
          <h2 className="text-xl font-semibold">Request submitted</h2>
          <p className="mt-2 text-[var(--color-text-muted)]">
            An existing developer needs to approve your account before you can log in. Once
            approved, log in with your email and the password you just chose.
          </p>

          <Link href="/developer/login">
            <Button variant="secondary" className="mt-6 w-full">
              Back to log in
            </Button>
          </Link>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card>
        <p className="mb-5 text-center text-sm text-[var(--color-text-muted)]">
          Already have an account?{" "}
          <Link href="/developer/login" className="font-medium text-[var(--color-brand)]">
            Log in
          </Link>
        </p>

        <h1 className="text-lg font-semibold">Request Developer Access</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          An existing developer will review and approve your account before you can log in.
        </p>

        <form action={formAction} className="mt-5 space-y-4">
          <input type="hidden" name="role" value="admin" />

          <div>
            <label htmlFor="full_name" className="mb-1 block text-sm font-medium">
              Full name
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <User size={18} />
              </span>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                autoComplete="name"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-4 text-base outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="identifier" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <Mail size={18} />
              </span>
              <input
                id="identifier"
                name="identifier"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-4 text-base outline-none focus:border-[var(--color-brand)]"
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
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-4 text-base outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm_password" className="mb-1 block text-sm font-medium">
              Confirm password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <Lock size={18} />
              </span>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-4 text-base outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          </div>

          {state.error && (
            <p className="rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Submitting..." : "Request account"}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
