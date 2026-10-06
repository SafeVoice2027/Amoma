import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrHandler } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { MONTH_LABELS, OverviewBreakdown, type OverviewData } from "@/components/overview-breakdown";
import type { ReportStatus, ReportType, SeverityLevel } from "@/types/database";

interface MonthlyRow {
  month: string;
  total: number;
  resolved: number;
  unresolved: number;
  in_process: number;
  bully_count: number;
  conflict_count: number;
}

function countBy<T>(items: T[], key: (item: T) => string | null): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

// Re-exported at app/developer/(protected)/overview/monthly/page.tsx.
// Computed live on every load — only a finished year gets frozen (see the
// Annual report), so there's nothing to persist or go stale here.
export default async function MonthlyOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const profile = await requireAdminOrHandler();
  const basePath = profile.role === "admin" ? "/developer" : "/admin";
  const params = await searchParams;

  const thisYear = new Date().getFullYear();
  const parsedYear = Number(params.year);
  const year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= thisYear + 1 ? parsedYear : thisYear;
  const parsedMonth = Number(params.month);
  const month = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : null;

  const supabase = await createClient();
  const { data: monthlyRaw, error: monthlyError } = await supabase.rpc("get_monthly_overview", { p_year: year });
  const monthly = (monthlyRaw ?? []) as MonthlyRow[];
  if (monthlyError) console.error("[monthly overview] get_monthly_overview failed", monthlyError);

  // The function only returns months that have reports — fill the rest as 0.
  const totals = new Map(monthly.map((m) => [Number(m.month.slice(5, 7)), m.total]));

  let detail: OverviewData | null = null;
  if (month) {
    // UTC boundaries, matching how get_monthly_overview buckets months.
    const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const end = new Date(Date.UTC(year, month, 1)).toISOString();

    const [{ data: reports }, { data: typeFiles }] = await Promise.all([
      supabase
        .from("reports")
        .select("type, status, severity")
        .gte("created_at", start)
        .lt("created_at", end)
        .returns<{ type: ReportType; status: ReportStatus; severity: SeverityLevel | null }[]>(),
      supabase
        .from("report_type_files")
        .select("bullying_type")
        .gte("created_at", start)
        .lt("created_at", end)
        .returns<{ bullying_type: string }[]>(),
    ]);

    const rows = reports ?? [];
    detail = {
      total: rows.length,
      resolved: rows.filter((r) => r.status === "resolved").length,
      unresolved: rows.filter((r) => r.status === "unresolved").length,
      inProcess: rows.filter((r) => r.status === "in_process").length,
      byReportType: countBy(rows, (r) => r.type),
      byBullyingType: countBy(typeFiles ?? [], (t) => t.bullying_type),
      bySeverity: countBy(rows, (r) => r.severity),
    };
  }

  return (
    <div>
      <PageHeader title="Monthly overview" subtitle={`${year} — pick a month for its full breakdown.`} />

      <div className="mb-4 flex items-center gap-4 text-sm">
        <Link href={`${basePath}/overview/monthly?year=${year - 1}`} className="text-[var(--color-brand)]">
          ← {year - 1}
        </Link>
        {year < thisYear && (
          <Link href={`${basePath}/overview/monthly?year=${year + 1}`} className="text-[var(--color-brand)]">
            {year + 1} →
          </Link>
        )}
        <Link href={`${basePath}/overview`} className="ml-auto text-[var(--color-text-muted)]">
          Back to overview
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {MONTH_LABELS.map((label, i) => {
          const m = i + 1;
          const active = month === m;
          return (
            <Link key={label} href={`${basePath}/overview/monthly?year=${year}&month=${m}`}>
              <div
                className={`rounded-2xl border p-3 text-center transition-colors ${
                  active
                    ? "border-[var(--color-brand)] bg-[var(--color-surface)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-background)]"
                }`}
              >
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-1 text-xl font-semibold">{totals.get(m) ?? 0}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        {detail ? (
          <>
            <h2 className="mb-3 text-lg font-semibold">
              {MONTH_LABELS[(month ?? 1) - 1]} {year}
            </h2>
            <OverviewBreakdown data={detail} />
          </>
        ) : (
          <Card>
            <p className="text-sm text-[var(--color-text-muted)]">Select a month above to see its summary.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
