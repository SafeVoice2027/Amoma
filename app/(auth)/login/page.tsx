"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { login, type LoginState } from "./actions";
import type { UserRole } from "@/types/database";

const ROLE_TABS: {
  role: UserRole;
  label: string;
  heading: string;
  subtitle: string;
  idLabel: string;
  idType: string;
  idPlaceholder: string;
  passwordLabel: string;
  submitLabel: string;
}[] = [
  {
    role: "student",
    label: "Student",
    heading: "Student Log In",
    subtitle: "Use your school-issued LRN to log in. Your identity stays private.",
    idLabel: "Learner Reference Number (LRN)",
    idType: "text",
    idPlaceholder: "123456789012",
    passwordLabel: "Password",
    submitLabel: "Log In Anonymously",
  },
  {
    role: "staff",
    label: "Staff",
    heading: "Teacher / Counselor Log In",
    subtitle: "Log in with your school staff email. Accounts require admin approval.",
    idLabel: "Staff Email Address",
    idType: "email",
    idPlaceholder: "you@deped.gov.ph",
    passwordLabel: "Password",
    submitLabel: "Log in",
  },
];

const initialState: LoginState = { error: null };

export default function LoginPage() {
  return (
    <Suspense fallback={<Card className="min-h-[26rem]"> </Card>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [role, setRole] = useState<UserRole>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(login, initialState);
  const next = useSearchParams().get("next") ?? "";
  const tab = ROLE_TABS.find((t) => t.role === role)!;

  return (
    <Card className="!p-4">
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-background)] p-1">
        {ROLE_TABS.map((t) => (
          <button
            key={t.role}
            type="button"
            onClick={() => setRole(t.role)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              role === t.role
                ? "bg-[var(--color-brand)] text-white shadow-sm"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mb-3 text-center text-sm text-[var(--color-text-muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-[var(--color-brand)]">
          Request Access
        </Link>
      </p>

      <h1 className="text-lg font-semibold">{tab.heading}</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{tab.subtitle}</p>

      <form action={formAction} className="mt-3 space-y-2">
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="next" value={next} />

        <div>
          <label htmlFor="identifier" className="mb-1 block text-sm font-medium">
            {tab.idLabel}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              {tab.role === "student" ? <User size={18} /> : <Mail size={18} />}
            </span>
            <input
              id="identifier"
              name="identifier"
              type={tab.idType}
              placeholder={tab.idPlaceholder}
              required
              autoComplete="username"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-base outline-none focus:border-[var(--color-brand)]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            {tab.passwordLabel}
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
          {pending ? "Logging in..." : tab.submitLabel}
        </Button>
      </form>

      {tab.role === "student" && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-2.5 text-xs text-[var(--color-text-muted)]">
          <EyeOff size={14} className="mt-0.5 flex-shrink-0" />
          <span>Your reports will be anonymous. Teachers cannot see who you are.</span>
        </div>
      )}
    </Card>
  );
}
