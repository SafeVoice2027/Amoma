"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, FileText, Bug, MessageSquare, BarChart3, Users, Settings } from "lucide-react";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { UrgentNotificationBell, type UrgentNotificationItem } from "@/components/urgent-notification-bell";
import { TeacherTagsMail, type TeacherTagMailItem } from "@/components/teacher-tags-mail";

// Bug reports and Accounts stay Admin-only — Handlers get everything else
// on this nav (see supabase/migrations/0010_handlers_and_teacher_tags.sql).
const NAV_ITEMS = [
  { href: "/admin", label: "Case overview", icon: LayoutGrid, adminOnly: false },
  { href: "/admin/reports", label: "All reports", icon: FileText, adminOnly: false },
  { href: "/admin/bug-reports", label: "Bug reports", icon: Bug, adminOnly: true },
  { href: "/admin/followups", label: "Followups", icon: MessageSquare, adminOnly: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, adminOnly: false },
  { href: "/admin/accounts", label: "Accounts", icon: Users, adminOnly: true },
];

function NavIcon({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
        active
          ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
      }`}
    >
      <Icon size={19} />
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
  tagItems,
}: {
  fullName: string;
  isAdmin: boolean;
  onSignOut: () => Promise<void>;
  urgentItems: UrgentNotificationItem[];
  unreadUrgentCount: number;
  markUrgentRead: () => Promise<void>;
  tagItems: TeacherTagMailItem[];
}) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <nav className="flex w-16 flex-shrink-0 flex-col items-center gap-2 border-r border-[var(--color-border)] py-4">
      <TeacherTagsMail items={tagItems} reportBasePath="/admin/reports" mode="sent" panelPlacement="right" />
      <UrgentNotificationBell
        items={urgentItems}
        unreadCount={unreadUrgentCount}
        reportBasePath="/admin/reports"
        markAllRead={markUrgentRead}
        panelPlacement="right"
      />
      {NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly).map((item) => (
        <NavIcon
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)}
        />
      ))}

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
                roleLabel={isAdmin ? "Admin" : "Handler"}
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
