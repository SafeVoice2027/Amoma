"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { CaseOverviewTable, type CaseRow } from "@/components/case-overview-table";

export function AdminCaseOverview({
  schoolName,
  statsSlot,
  rows,
  hrefBase,
}: {
  schoolName: string;
  statsSlot: ReactNode;
  rows: CaseRow[];
  /** "/admin" for a Handler viewer, "/developer" for the real admin — see
   *  lib/supabase/middleware.ts. */
  hrefBase: string;
}) {
  const [search, setSearch] = useState("");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Case overview</h1>
          <p className="mt-1 text-[var(--color-text-muted)]">{schoolName}</p>
        </div>
        <div className="flex w-full items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 sm:w-64">
          <Search size={16} className="text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracking code"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{statsSlot}</div>

      <CaseOverviewTable rows={rows} search={search} hrefBase={hrefBase} />
    </div>
  );
}
