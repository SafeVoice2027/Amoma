"use client";

import { useTransition } from "react";
import type { BugReportStatus } from "@/types/database";

const OPTIONS: { value: BugReportStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

export function BugReportStatusSelect({
  status,
  onChange,
}: {
  status: BugReportStatus;
  onChange: (status: BugReportStatus) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => onChange(e.target.value as BugReportStatus))}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
