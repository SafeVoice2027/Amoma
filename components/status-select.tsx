"use client";

import { useTransition } from "react";
import type { ReportStatus } from "@/types/database";

const OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: "unresolved", label: "Unresolved" },
  { value: "in_process", label: "In process" },
  { value: "resolved", label: "Resolved" },
];

export function StatusSelect({
  status,
  onChange,
}: {
  status: ReportStatus;
  onChange: (status: ReportStatus) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => onChange(e.target.value as ReportStatus))}
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
