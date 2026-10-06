import Link from "next/link";
import { CalendarDays, Archive } from "lucide-react";
import { requireAdminOrHandler } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";

// Re-exported at app/developer/(protected)/overview/page.tsx — both Admin
// (Handler) and Developer use this, each under their own URL prefix.
export default async function ReportsOverviewPage() {
  const profile = await requireAdminOrHandler();
  const basePath = profile.role === "admin" ? "/developer" : "/admin";

  return (
    <div>
      <PageHeader title="Reports overview" subtitle="Month-by-month totals, and the yearly archive." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`${basePath}/overview/monthly`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CalendarDays className="text-[var(--color-brand)]" size={24} />
            <h2 className="mt-3 text-lg font-semibold">Monthly overview</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Pick a month of the current year to see its totals, status, type and severity breakdown. Always live.
            </p>
          </Card>
        </Link>
        <Link href={`${basePath}/overview/annual`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <Archive className="text-[var(--color-brand)]" size={24} />
            <h2 className="mt-3 text-lg font-semibold">Annual report</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Frozen year-end archives, generated automatically each January 1st, ready to print.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
