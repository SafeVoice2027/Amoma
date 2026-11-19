"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui";
import { AccountRow, type Sf1Status } from "@/components/account-row";
import type { StudentEnrollment } from "@/app/admin/actions";
import type { AdminPosition, UserRole } from "@/types/database";

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

export function AccountList({
  accounts,
  viewerId,
  canManageAdmins,
  onChangePassword,
  onToggleHandler,
  onSetEmployeeNumber,
  onSetAdminPosition,
  onSetEnrollment,
}: {
  accounts: AccountProfile[];
  // The signed-in person, and whether they may make Admins / set positions /
  // reset other Admins' passwords (the Developer and a school's Learner
  // Formation Officer). The server checks all of this again on every action.
  viewerId: string;
  canManageAdmins: boolean;
  onChangePassword: (profileId: string, newPassword: string) => Promise<{ error: string | null }>;
  onToggleHandler: (profileId: string, isHandler: boolean) => Promise<{ error: string | null }>;
  onSetEmployeeNumber: (profileId: string, employeeNumber: string) => Promise<{ error: string | null }>;
  onSetAdminPosition: (profileId: string, position: AdminPosition) => Promise<{ error: string | null }>;
  onSetEnrollment: (profileId: string, answer: StudentEnrollment) => Promise<{ error: string | null }>;
}) {
  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const missingCount = accounts.filter((a) => a.sf1 === "missing").length;

  const filtered = accounts.filter((a) => {
    if (onlyMissing && a.sf1 !== "missing") return false;
    const haystack = `${a.full_name ?? ""} ${a.lrn ?? ""} ${a.deped_email ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          <Search size={18} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, LRN, or email..."
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-brand)]"
        />
      </div>

      {(missingCount > 0 || onlyMissing) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setOnlyMissing(!onlyMissing)}
            aria-pressed={onlyMissing}
            className={`rounded-full border px-3 py-1.5 ${
              onlyMissing
                ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
                : "border-[var(--color-border)] bg-[var(--color-surface)]"
            }`}
          >
            Not in latest SF1 ({missingCount})
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">
            Students who weren&apos;t in your latest SF1 import. Open one to say if they&apos;re still enrolled,
            graduated or transferred.
          </span>
        </div>
      )}

      {notice && (
        <p className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-green-600">
          {notice}
        </p>
      )}

      {filtered.length === 0 ? (
        <Card>
          <p className="text-[var(--color-text-muted)]">
            {accounts.length === 0 ? "No approved accounts yet." : "No accounts match your search."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <AccountRow
              key={a.id}
              profile={a}
              isSelf={a.id === viewerId}
              canReset={canManageAdmins || a.role === "student" || !a.is_handler}
              canManage={canManageAdmins && a.role === "staff" && a.id !== viewerId}
              onChangePassword={onChangePassword}
              onToggleHandler={onToggleHandler}
              onSetEmployeeNumber={onSetEmployeeNumber}
              onSetAdminPosition={onSetAdminPosition}
              onSetEnrollment={onSetEnrollment}
              onNotice={setNotice}
            />
          ))}
        </div>
      )}
    </div>
  );
}
