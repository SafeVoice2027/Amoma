"use client";

import Link from "next/link";
import { useState } from "react";
import { Settings } from "lucide-react";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { UrgentNotificationBell, type UrgentNotificationItem } from "@/components/urgent-notification-bell";

export function StaffHeader({
  fullName,
  onSignOut,
  urgentItems,
  unreadUrgentCount,
  markUrgentRead,
}: {
  fullName: string;
  onSignOut: () => Promise<void>;
  urgentItems: UrgentNotificationItem[];
  unreadUrgentCount: number;
  markUrgentRead: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/staff" className="text-lg font-semibold text-[var(--color-brand)]">
          Amoma · Staff
        </Link>

        <div className="flex items-center gap-1">
          <UrgentNotificationBell
            items={urgentItems}
            unreadCount={unreadUrgentCount}
            reportBasePath="/staff/reports"
            markAllRead={markUrgentRead}
          />

          <div className="relative">
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              onClick={() => setOpen((o) => !o)}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                open
                  ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
              }`}
            >
              <Settings size={18} />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-11 z-20">
                  <AccountSettingsPanel
                    name={fullName}
                    helpHubHref="/staff/help"
                    onSignOut={onSignOut}
                    onNavigate={() => setOpen(false)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
