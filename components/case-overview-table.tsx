"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type { ReportCategory, ReportStatus } from "@/types/database";

// Must match RECENT_REPORTER_WINDOW_DAYS in app/admin/page.tsx, which is
// where `reporterRecentCount` below is actually computed.
const RECENT_WINDOW_DAYS = 7;

export interface CaseRow {
  id: string;
  caseId: string;
  category: ReportCategory | null;
  status: ReportStatus;
  flagged: boolean;
  submittedAt: string;
  assignedName: string | null;
  // Purely mechanical count (not a credibility judgment — see app/admin/page.tsx)
  // of reports from the same reporter in the last 7 days. Set only when >= 2.
  reporterRecentCount?: number | null;
}

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  social: "Social",
  cyber: "Cyber",
  verbal: "Verbal",
  physical: "Physical",
  conflict: "Conflict",
};

export const CATEGORY_STYLES: Record<ReportCategory, string> = {
  social: "bg-violet-500/15 text-violet-400",
  cyber: "bg-red-500/15 text-red-400",
  verbal: "bg-amber-500/15 text-amber-400",
  physical: "bg-blue-500/15 text-blue-400",
  conflict:
    "bg-[color-mix(in_srgb,var(--color-accent-500)_15%,transparent)] text-[var(--color-accent-500)]",
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  unresolved: "Unresolved",
  in_process: "In progress",
  resolved: "Resolved",
};

type CategoryFilter = "all" | ReportCategory;
type StatusFilter = "all" | ReportStatus;
type SortOrder = "newest" | "oldest" | "flagged";

export function CaseOverviewTable({
  rows,
  search,
  hrefBase,
}: {
  rows: CaseRow[];
  search: string;
  /** "/admin" for a Handler viewer, "/developer" for the real admin — see
   *  lib/supabase/middleware.ts. */
  hrefBase: string;
}) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");

  const visible = useMemo(() => {
    let result = rows;

    const query = search.trim().toLowerCase();
    if (query) result = result.filter((r) => r.caseId.toLowerCase().includes(query));
    if (categoryFilter !== "all") result = result.filter((r) => r.category === categoryFilter);
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);

    result = [...result].sort((a, b) => {
      if (sort === "flagged") {
        if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      const diff = new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      return sort === "oldest" ? -diff : diff;
    });

    return result;
  }, [rows, search, categoryFilter, statusFilter, sort]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          value={categoryFilter}
          onChange={(v) => setCategoryFilter(v as CategoryFilter)}
          options={[
            { value: "all", label: "All categories" },
            { value: "social", label: "Social" },
            { value: "cyber", label: "Cyber" },
            { value: "verbal", label: "Verbal" },
            { value: "physical", label: "Physical" },
            { value: "conflict", label: "Conflict" },
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { value: "all", label: "All statuses" },
            { value: "unresolved", label: "Unresolved" },
            { value: "in_process", label: "In progress" },
            { value: "resolved", label: "Resolved" },
          ]}
        />
        <Select
          value={sort}
          onChange={(v) => setSort(v as SortOrder)}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "flagged", label: "Flagged first" },
            { value: "oldest", label: "Oldest first" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-[var(--color-text-muted)]">
              <th className="px-4 py-3">Tracking code</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-background)]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`${hrefBase}/reports/${row.id}`}
                    className="font-semibold text-[var(--color-brand)] hover:underline"
                  >
                    {row.caseId}
                  </Link>
                  {row.reporterRecentCount ? (
                    <p
                      className="mt-0.5 text-xs text-[var(--color-text-muted)]"
                      title={`This reporter has filed ${row.reporterRecentCount} reports in the last ${RECENT_WINDOW_DAYS} days.`}
                    >
                      {row.reporterRecentCount} reports · {RECENT_WINDOW_DAYS}d
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {row.category ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLES[row.category]}`}
                    >
                      {CATEGORY_LABELS[row.category]}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">
                  {new Date(row.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  {row.flagged ? (
                    <span className="inline-flex items-center gap-1.5 text-[var(--color-danger-500)]">
                      <TriangleAlert size={14} />
                      Flagged
                    </span>
                  ) : (
                    <span className="text-[var(--color-text)]">{STATUS_LABELS[row.status]}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">
                  {row.assignedName ?? "Unassigned"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No cases match these filters.
          </p>
        )}
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
