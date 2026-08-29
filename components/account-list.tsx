"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui";
import { AccountRow } from "@/components/account-row";
import type { UserRole } from "@/types/database";

interface AccountProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  lrn: string | null;
  deped_email: string | null;
}

export function AccountList({
  accounts,
  onChangePassword,
}: {
  accounts: AccountProfile[];
  onChangePassword: (profileId: string, newPassword: string) => Promise<{ error: string | null }>;
}) {
  const [query, setQuery] = useState("");

  const filtered = accounts.filter((a) => {
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

      {filtered.length === 0 ? (
        <Card>
          <p className="text-[var(--color-text-muted)]">
            {accounts.length === 0 ? "No approved accounts yet." : "No accounts match your search."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <AccountRow key={a.id} profile={a} onChangePassword={onChangePassword} />
          ))}
        </div>
      )}
    </div>
  );
}
