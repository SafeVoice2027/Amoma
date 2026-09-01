"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

export interface TeacherTagMailItem {
  id: string;
  reportId: string;
  caseId: string;
  note: string | null;
  createdAt: string;
  readAt: string | null;
  // Admin "sent" mode only — who the tag went to.
  teacherName?: string;
}

// Shared by the Teacher inbox (tags addressed to them, "inbox" mode) and the
// Admin sent-history view ("sent" mode, shows who was tagged and whether
// they've read it). Same dropdown-off-a-header-icon pattern as
// UrgentNotificationBell, but for report_teacher_tags rather than
// `notifications`.
export function TeacherTagsMail({
  items,
  reportBasePath,
  mode,
  markRead,
  panelPlacement = "below",
}: {
  items: TeacherTagMailItem[];
  reportBasePath: string;
  mode: "inbox" | "sent";
  markRead?: (tagId: string) => Promise<void>;
  panelPlacement?: "below" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const unreadCount = mode === "inbox" ? items.filter((i) => !i.readAt).length : 0;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={mode === "inbox" ? "Tagged reports" : "Sent tags"}
        title={mode === "inbox" ? "Tagged reports" : "Sent tags"}
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          unreadCount > 0
            ? "text-[var(--color-brand)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
        }`}
      >
        <Mail size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-brand)]" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-20 w-80 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-lg ${
              panelPlacement === "right" ? "top-0 left-full ml-2" : "right-0 top-11"
            }`}
          >
            <p className="px-2 py-1 text-sm font-semibold">
              {mode === "inbox" ? "Tagged reports" : "Sent tags"}
            </p>
            {items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[var(--color-text-muted)]">
                {mode === "inbox" ? "No reports tagged to you yet." : "No tags sent yet."}
              </p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`${reportBasePath}/${item.reportId}`}
                    onClick={() => {
                      setOpen(false);
                      if (mode === "inbox" && !item.readAt && markRead) {
                        startTransition(() => markRead(item.id));
                      }
                    }}
                    className="block rounded-xl px-2 py-2 hover:bg-[var(--color-background)]"
                  >
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {mode === "inbox" && !item.readAt && (
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-brand)]" />
                      )}
                      {item.caseId}
                      {mode === "sent" && item.teacherName && (
                        <span className="font-normal text-[var(--color-text-muted)]">→ {item.teacherName}</span>
                      )}
                    </p>
                    {item.note && (
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{item.note}</p>
                    )}
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {new Date(item.createdAt).toLocaleString()}
                      {mode === "sent" && (item.readAt ? " · Read" : " · Unread")}
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
