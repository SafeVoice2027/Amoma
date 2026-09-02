import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrHandler } from "@/lib/auth";
import { Card, PageHeader, SeverityBadge, StatusBadge } from "@/components/ui";
import type { Report } from "@/types/database";

export default async function AdminReportsPage() {
  await requireAdminOrHandler();
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, type, status, severity, is_anonymous, created_at")
    .order("created_at", { ascending: false })
    .returns<Pick<Report, "id" | "type" | "status" | "severity" | "is_anonymous" | "created_at">[]>();

  return (
    <div>
      <PageHeader title="All reports" subtitle="Every report across the school, most recent first." />
      <div className="space-y-3">
        {(reports ?? []).map((r) => (
          <Link key={r.id} href={`/admin/reports/${r.id}`}>
            <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
              <div>
                <p className="font-medium">
                  {r.type === "bully" ? "Bullying report" : "Conflict report"}
                  {r.is_anonymous && (
                    <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">Anonymous</span>
                  )}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                <SeverityBadge severity={r.severity} />
              </div>
            </Card>
          </Link>
        ))}
        {!reports?.length && (
          <Card>
            <p className="text-[var(--color-text-muted)]">No reports yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
