import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrHandler } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { AnnualReportCard } from "@/components/annual-report-card";
import { markAnnualReportPrinted } from "@/app/admin/actions";
import type { AnnualReport } from "@/types/database";

// Re-exported at app/developer/(protected)/overview/annual/page.tsx.
export default async function AnnualReportsPage() {
  const profile = await requireAdminOrHandler();
  const basePath = profile.role === "admin" ? "/developer" : "/admin";
  const supabase = await createClient();

  const { data: reports, error } = await supabase
    .from("annual_reports")
    .select("*")
    .order("year", { ascending: false })
    .returns<AnnualReport[]>();
  if (error) console.error("[annual reports] query failed", error);

  async function markPrinted(id: string) {
    "use server";
    return markAnnualReportPrinted(id, basePath);
  }

  return (
    <div>
      <PageHeader
        title="Annual report"
        subtitle="Frozen at year-end — these never change after they're generated."
      />
      <div className="mb-4 text-sm">
        <Link href={`${basePath}/overview`} className="text-[var(--color-text-muted)]">
          Back to overview
        </Link>
      </div>

      <div className="space-y-4">
        {(reports ?? []).map((r) => (
          <AnnualReportCard key={r.id} report={r} markPrinted={markPrinted} />
        ))}
        {!reports?.length && (
          <Card>
            <p className="text-sm text-[var(--color-text-muted)]">
              No annual reports yet. The first one is generated automatically on January 1st for the year that just
              ended.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
