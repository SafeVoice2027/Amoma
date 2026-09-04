"use client";

import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import type { UserRole } from "@/types/database";

interface AccountProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  lrn: string | null;
  deped_email: string | null;
  is_handler: boolean;
  employee_number: string | null;
}

export function AccountRow({
  profile,
  onChangePassword,
  onToggleHandler,
  onSetEmployeeNumber,
}: {
  profile: AccountProfile;
  onChangePassword: (profileId: string, newPassword: string) => Promise<{ error: string | null }>;
  onToggleHandler: (profileId: string, isHandler: boolean) => Promise<{ error: string | null }>;
  onSetEmployeeNumber: (profileId: string, employeeNumber: string) => Promise<{ error: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const [handlerPending, startHandlerTransition] = useTransition();
  const [handlerError, setHandlerError] = useState<string | null>(null);

  const [employeeNumber, setEmployeeNumber] = useState(profile.employee_number ?? "");
  const [empPending, startEmpTransition] = useTransition();
  const [empError, setEmpError] = useState<string | null>(null);
  const [empSuccess, setEmpSuccess] = useState(false);

  function toggleHandler() {
    setHandlerError(null);
    const next = !profile.is_handler;
    startHandlerTransition(async () => {
      const result = await onToggleHandler(profile.id, next);
      if (result.error) setHandlerError(result.error);
    });
  }

  function saveEmployeeNumber() {
    setEmpError(null);
    setEmpSuccess(false);
    startEmpTransition(async () => {
      const result = await onSetEmployeeNumber(profile.id, employeeNumber);
      if (result.error) setEmpError(result.error);
      else setEmpSuccess(true);
    });
  }

  function reset() {
    setOpen(false);
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
  }

  function submit() {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    startTransition(async () => {
      const result = await onChangePassword(profile.id, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {profile.full_name ?? (profile.role === "student" ? "Anonymous student" : "(no name on file)")}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {profile.role === "student" ? "Student" : "Staff"} ·{" "}
            {profile.lrn ?? profile.deped_email ?? profile.employee_number}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => (open ? reset() : setOpen(true))}
          className="min-h-0 flex-shrink-0 px-3 py-2 text-sm"
        >
          {open ? "Cancel" : "Change Password"}
        </Button>
      </div>

      {profile.role === "staff" && (
        <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={profile.is_handler}
              disabled={handlerPending}
              onChange={toggleHandler}
              className="h-4 w-4 rounded border-[var(--color-border)]"
            />
            Admin — can update the Report Status checklist
          </label>
          {handlerError && <p className="text-sm text-[var(--color-danger-600)]">{handlerError}</p>}

          <div>
            <label className="mb-1 block text-sm font-medium">Employee Number (Teacher login)</label>
            <div className="flex gap-2">
              <input
                value={employeeNumber}
                onChange={(e) => {
                  setEmployeeNumber(e.target.value);
                  setEmpSuccess(false);
                }}
                placeholder="e.g. 2024-00123"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              />
              <Button
                variant="secondary"
                disabled={empPending}
                onClick={saveEmployeeNumber}
                className="min-h-0 flex-shrink-0 px-3 py-2 text-sm"
              >
                {empPending ? "Saving..." : "Save"}
              </Button>
            </div>
            {empError && <p className="mt-1 text-sm text-[var(--color-danger-600)]">{empError}</p>}
            {empSuccess && <p className="mt-1 text-sm text-green-600">Saved.</p>}
          </div>
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </div>

          {error && <p className="text-sm text-[var(--color-danger-600)]">{error}</p>}
          {success && <p className="text-sm text-green-600">Password updated.</p>}

          <Button disabled={pending} onClick={submit} className="min-h-0 px-4 py-2 text-sm">
            {pending ? "Saving..." : "Save new password"}
          </Button>
        </div>
      )}
    </Card>
  );
}
