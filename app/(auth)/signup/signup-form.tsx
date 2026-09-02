"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { signup, type SignupState } from "./actions";
import type { UserRole } from "@/types/database";

const ROLE_TABS: { role: UserRole; label: string; idLabel: string; idType: string; idPlaceholder: string }[] = [
  { role: "student", label: "Student", idLabel: "LRN", idType: "text", idPlaceholder: "123456789012" },
  { role: "staff", label: "Staff", idLabel: "DepEd email", idType: "email", idPlaceholder: "you@deped.gov.ph" },
];

const initialState: SignupState = { error: null, success: false };

export function SignupForm() {
  const [role, setRole] = useState<UserRole>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [state, formAction, pending] = useActionState(signup, initialState);
  const tab = ROLE_TABS.find((t) => t.role === role)!;

  if (state.success) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">{state.autoApproved ? "You're all set" : "Request submitted"}</h2>
        <p className="mt-2 text-[var(--color-text-muted)]">
          {state.autoApproved
            ? `Your account is ready to go — log in with ${role === "student" ? "your LRN" : "your email"} and the password you just chose.`
            : `A school admin needs to approve your account before you can log in. Once approved, log in with ${role === "student" ? "your LRN" : "your email"} and the password you just chose.`}
        </p>

        <Link href="/login">
          <Button variant="secondary" className="mt-6 w-full">
            Back to log in
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-background)] p-1">
        {ROLE_TABS.map((t) => (
          <button
            key={t.role}
            type="button"
            onClick={() => setRole(t.role)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              role === t.role
                ? "bg-[var(--color-surface)] text-[var(--color-brand)] shadow-sm"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mb-5 text-center text-sm text-[var(--color-text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--color-brand)]">
          Log in
        </Link>
      </p>

      <h1 className="text-lg font-semibold">Request Access</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        {role === "student"
          ? "Choose a password to log in with your LRN. We don't ask for your name — your reports stay anonymous."
          : "An admin will review and approve your account before you can log in."}
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="role" value={role} />

        {role !== "student" && (
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
        )}

        <div>
          <label htmlFor="identifier" className="mb-1 block text-sm font-medium">
            {tab.idLabel}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              {role === "student" ? <User size={18} /> : <Mail size={18} />}
            </span>
            <input
              id="identifier"
              name="identifier"
              type={tab.idType}
              placeholder={tab.idPlaceholder}
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
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-10 text-base outline-none focus:border-[var(--color-brand)]"
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
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-10 text-base outline-none focus:border-[var(--color-brand)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
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
  );
}
