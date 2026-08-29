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
}

export function AccountRow({
  profile,
  onChangePassword,
}: {
  profile: AccountProfile;
  onChangePassword: (profileId: string, newPassword: string) => Promise<{ error: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

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
          <p className="truncate font-medium">{profile.full_name ?? "(no name on file)"}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {profile.role === "student" ? "Student" : "Staff"} · {profile.lrn ?? profile.deped_email}
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
