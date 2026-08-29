"use client";

import { useState } from "react";
import Link from "next/link";
import { ListChecks, OctagonAlert } from "lucide-react";
import { STAGE_TITLES } from "@/lib/reports/stage-labels";
import type { ReportStage } from "@/types/database";

export interface ReportStatusItem {
  id: string;
  caseId: string;
  reportType: "bully" | "conflict";
  currentStage: ReportStage;
  closed: boolean;
  hasUpdate: boolean;
}

export function ReportStatusBell({ items, unreadCount }: { items: ReportStatusItem[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Report status"
        title="Report status"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
      >
        <ListChecks size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger-600)] px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-lg">
            <p className="px-2 py-1 text-sm font-semibold">Report status</p>
            {items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[var(--color-text-muted)]">No status updates yet.</p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/student/reports/${item.id}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-2 py-2 text-left hover:bg-[var(--color-background)]"
                  >
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {item.hasUpdate && (
                        <OctagonAlert
                          size={14}
                          className="flex-shrink-0 text-[var(--color-danger-500)]"
                          aria-label="Update"
                        />
                      )}
                      {item.reportType === "bully" ? "Bully" : "Conflict"} · {item.caseId}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {item.closed ? "Closed" : STAGE_TITLES[item.currentStage]}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
