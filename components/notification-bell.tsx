"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";

export interface NotificationItem {
  id: string;
  reportId: string;
  caseId: string;
  reportType: "bully" | "conflict";
  preview: string;
  createdAt: string;
}

export function NotificationBell({
  items,
  unreadCount,
  markAllRead,
}: {
  items: NotificationItem[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();

  const showDot = unreadCount > 0 && !dismissed;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((o) => !o);
          if (showDot) {
            setDismissed(true);
            startTransition(markAllRead);
          }
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
      >
        <Bell size={20} />
        {showDot && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--color-danger-600)]" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-lg">
            <p className="px-2 py-1 text-sm font-semibold">Notifications</p>
            {items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[var(--color-text-muted)]">No notifications yet.</p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {items.map((item) => (
                  // A plain <a>, not next/link: this is an in-page fragment
                  // jump (no route change), and only a native anchor click
                  // reliably fires `hashchange` for ReportsList's
                  // useSyncExternalStore to pick up — Next's Link handles
                  // hash hrefs via history.pushState, which doesn't.
                  <a
                    key={item.id}
                    href={`#report-${item.reportId}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-2 py-2 text-left hover:bg-[var(--color-background)]"
                  >
                    <p className="text-sm font-medium">
                      {item.reportType === "bully" ? "Bully" : "Conflict"} · {item.caseId}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-muted)]">{item.preview}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
