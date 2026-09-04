"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, FileText, Bug, MessageSquare, BarChart3, Users, Settings } from "lucide-react";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { UrgentNotificationBell, type UrgentNotificationItem } from "@/components/urgent-notification-bell";
import { TeacherTagsMail, type TeacherTagMailItem } from "@/components/teacher-tags-mail";

// Bug reports and Accounts are Developer-only — they only exist under
// /developer/* at all now (see app/developer/(protected)/{bug-reports,accounts}),
// Handlers never see them. Every other item exists under both /admin and
// /developer (see app/developer/(protected)/* — thin re-exports of
// app/admin/(protected)/*); `path` is relative to whichever basePath the
// viewer is actually on. countKey looks up how many unaddressed items to
// badge the icon with — see AdminLayout for where those counts are computed.
const NAV_ITEMS = [
  { path: "", label: "Case overview", icon: LayoutGrid, adminOnly: false, countKey: "pendingApprovals" as const },
  { path: "/reports", label: "All reports", icon: FileText, adminOnly: false, countKey: null },
  { path: "/bug-reports", label: "Bug reports", icon: Bug, adminOnly: true, countKey: "openBugReports" as const },
  { path: "/followups", label: "Followups", icon: MessageSquare, adminOnly: false, countKey: null },
  { path: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: false, countKey: null },
  { path: "/accounts", label: "Accounts", icon: Users, adminOnly: true, countKey: null },
];

function NavIcon({
  href,
  label,
  icon: Icon,
  active,
  count,
}: {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  active: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={count ? `${label} (${count} pending)` : label}
      title={count ? `${label} (${count} pending)` : label}
      className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
        active
          ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
      }`}
    >
      <Icon size={19} />
      {!!count && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger-600)] px-1 text-[10px] font-semibold leading-none text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

export function AdminSidebar({
  fullName,
  isAdmin,
  onSignOut,
  urgentItems,
  unreadUrgentCount,
  markUrgentRead,
  pollUrgentAlerts,
  tagItems,
  pendingApprovalsCount,
  openBugReportsCount,
}: {
  fullName: string;
  isAdmin: boolean;
  onSignOut: () => Promise<void>;
  urgentItems: UrgentNotificationItem[];
  unreadUrgentCount: number;
  markUrgentRead: () => Promise<void>;
  pollUrgentAlerts: () => Promise<{ items: UrgentNotificationItem[]; unreadCount: number }>;
  tagItems: TeacherTagMailItem[];
  pendingApprovalsCount: number;
  openBugReportsCount: number;
}) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const basePath = isAdmin ? "/developer" : "/admin";
  const counts: Record<string, number> = {
    pendingApprovals: pendingApprovalsCount,
    openBugReports: openBugReportsCount,
  };

  return (
    <nav className="flex w-16 flex-shrink-0 flex-col items-center gap-2 border-r border-[var(--color-border)] py-4">
      <TeacherTagsMail items={tagItems} reportBasePath={`${basePath}/reports`} mode="sent" panelPlacement="right" />
      <UrgentNotificationBell
        items={urgentItems}
        unreadCount={unreadUrgentCount}
        reportBasePath={`${basePath}/reports`}
        markAllRead={markUrgentRead}
        pollAction={pollUrgentAlerts}
        panelPlacement="right"
      />
      {NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly).map((item) => {
        const href = `${basePath}${item.path}`;
        return (
          <NavIcon
            key={item.path}
            href={href}
            label={item.label}
            icon={item.icon}
            active={item.path === "" ? pathname === basePath : pathname.startsWith(href)}
            count={item.countKey ? counts[item.countKey] : undefined}
          />
        );
      })}

      <div className="relative">
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          onClick={() => setSettingsOpen((o) => !o)}
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
            settingsOpen
              ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
          }`}
        >
          <Settings size={19} />
        </button>

        {settingsOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setSettingsOpen(false)} />
            <div className="absolute top-0 left-full z-20 ml-2">
              {/* Admin has no Help Hub — Contact Us lived on the old
                  /admin/settings page, replaced by this popover. */}
              <AccountSettingsPanel
                name={fullName}
                roleLabel={isAdmin ? "Developer" : "Admin"}
                onSignOut={onSignOut}
                onNavigate={() => setSettingsOpen(false)}
              />
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
