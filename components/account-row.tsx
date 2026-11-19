"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { StudentEnrollment } from "@/app/admin/actions";
import type { AdminPosition, UserRole } from "@/types/database";

// Where a student stands against the school's latest SF1 import:
//   in        — was in it
//   missing   — wasn't, and nobody has said what happened (needs an answer)
//   confirmed — wasn't, but an Admin said they're still enrolled
//   none      — nothing to compare (staff, no grade, or no import yet)
export type Sf1Status = "in" | "missing" | "confirmed" | "none";

interface AccountProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  lrn: string | null;
  deped_email: string | null;
  is_handler: boolean;
  employee_number: string | null;
  admin_position: AdminPosition | null;
  grade_level: number | null;
  section: string | null;
  sf1: Sf1Status;
}

export function AccountRow({
  profile,
  isSelf,
  canReset,
  canManage,
  onChangePassword,
  onToggleHandler,
  onSetEmployeeNumber,
  onSetAdminPosition,
  onSetEnrollment,
  onNotice,
}: {
  profile: AccountProfile;
  // You can't change your own Admin status or position; whether you may reset
  // this person's password / manage them is decided by your own position.
  isSelf: boolean;
  canReset: boolean;
  canManage: boolean;
  onChangePassword: (profileId: string, newPassword: string) => Promise<{ error: string | null }>;
  onToggleHandler: (profileId: string, isHandler: boolean) => Promise<{ error: string | null }>;
  onSetEmployeeNumber: (profileId: string, employeeNumber: string) => Promise<{ error: string | null }>;
  onSetAdminPosition: (profileId: string, position: AdminPosition) => Promise<{ error: string | null }>;
  onSetEnrollment: (profileId: string, answer: StudentEnrollment) => Promise<{ error: string | null }>;
  onNotice: (text: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Student enrollment panel (click the student to open it).
  const isStudent = profile.role === "student";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirming, setConfirming] = useState<"graduated" | "transferred" | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollNote, setEnrollNote] = useState<string | null>(null);
  const [enrollPending, startEnrollTransition] = useTransition();

  function answerEnrollment(answer: StudentEnrollment) {
    setEnrollError(null);
    setEnrollNote(null);
    setConfirming(null);
    startEnrollTransition(async () => {
      const result = await onSetEnrollment(profile.id, answer);
      if (result.error) {
        setEnrollError(result.error);
        return;
      }
      if (answer === "enrolled") {
        setEnrollNote("Saved — marked as still enrolled.");
      } else {
        // The row disappears from this list once switched off, so say it up top.
        onNotice(
          `${profile.lrn} was switched off (${answer}). Nothing was deleted — you can switch them back on from the Import students page.`,
        );
      }
      router.refresh();
    });
  }
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

  function changePosition(position: AdminPosition) {
    setHandlerError(null);
    startHandlerTransition(async () => {
      const result = await onSetAdminPosition(profile.id, position);
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
        {isStudent ? (
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            aria-expanded={detailsOpen}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{profile.full_name ?? "Anonymous student"}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Student · {profile.lrn}
                {profile.sf1 === "missing" && (
                  <span className="ml-2 rounded-full bg-[var(--color-accent-50)] px-2 py-0.5 text-xs text-[var(--color-accent-800)]">
                    Not in latest SF1
                  </span>
                )}
              </p>
            </div>
            <ChevronDown
              size={16}
              className={`ml-auto flex-shrink-0 text-[var(--color-text-muted)] transition-transform ${detailsOpen ? "rotate-180" : ""}`}
            />
          </button>
        ) : (
          <div className="min-w-0">
            <p className="truncate font-medium">{profile.full_name ?? "(no name on file)"}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Staff · {profile.deped_email ?? profile.employee_number}
              {isSelf ? " · You" : ""}
            </p>
          </div>
        )}
        {canReset && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => (open ? reset() : setOpen(true))}
            className="min-h-0 flex-shrink-0 px-3 py-2 text-sm"
          >
            {open ? "Cancel" : "Change Password"}
          </Button>
        )}
      </div>

      {isStudent && detailsOpen && (
        <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4 text-sm">
          <p>
            <span className="text-[var(--color-text-muted)]">Grade and section: </span>
            {profile.grade_level
              ? `Grade ${profile.grade_level}${profile.section ? ` - ${profile.section}` : ""}`
              : "Not recorded yet"}
          </p>
          <p className="text-[var(--color-text-muted)]">
            {profile.sf1 === "in" && "In your latest SF1 import."}
            {profile.sf1 === "missing" && "Not in your latest SF1 import — what happened to this student?"}
            {profile.sf1 === "confirmed" && "Not in your latest SF1 import, but you marked them as still enrolled."}
            {profile.sf1 === "none" && "Is this student still enrolled, or did they graduate or transfer?"}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={enrollPending}
              onClick={() => answerEnrollment("enrolled")}
              className="!min-h-0 !px-3 !py-1.5 !text-sm"
            >
              Still enrolled
            </Button>
            <Button
              variant="secondary"
              disabled={enrollPending}
              onClick={() => setConfirming("graduated")}
              className="!min-h-0 !px-3 !py-1.5 !text-sm"
            >
              Graduated
            </Button>
            <Button
              variant="secondary"
              disabled={enrollPending}
              onClick={() => setConfirming("transferred")}
              className="!min-h-0 !px-3 !py-1.5 !text-sm"
            >
              Transferred
            </Button>
          </div>

          {confirming && (
            <div className="rounded-xl border border-[var(--color-accent-300)] bg-[var(--color-accent-50)] p-3 text-[var(--color-accent-800)]">
              <p>
                Switch off <strong>{profile.lrn}</strong> as <strong>{confirming}</strong>? They won&apos;t be able to
                log in. Their reports stay, and you can switch them back on.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  disabled={enrollPending}
                  onClick={() => answerEnrollment(confirming)}
                  className="!min-h-0 !px-4 !py-2 !text-sm"
                >
                  Yes, switch off
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(null)} className="!min-h-0 !px-4 !py-2 !text-sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {enrollError && <p className="text-[var(--color-danger-600)]">{enrollError}</p>}
          {enrollNote && <p className="text-green-600">{enrollNote}</p>}
        </div>
      )}

      {canManage && (
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
          {profile.is_handler && (
            <div>
              <label className="mb-1 block text-sm font-medium">Admin position</label>
              <select
                value={profile.admin_position ?? ""}
                disabled={handlerPending}
                onChange={(e) => changePosition(e.target.value as AdminPosition)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              >
                <option value="" disabled>
                  Select a position
                </option>
                <option value="learner_formation_officer">Learner Formation Officer — assesses and handles cases</option>
                <option value="guidance_counselor">Guidance Counselor — handles Serious and Complex cases</option>
                <option value="school_head">School Head — views cases, leads Complex cases</option>
              </select>
            </div>
          )}
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

      {open && canReset && (
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
