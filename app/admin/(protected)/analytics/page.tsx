import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import type { Report, ReportCategory, ReportStatus, SeverityLevel } from "@/types/database";

type ReportRow = Pick<
  Report,
  "id" | "type" | "status" | "severity" | "category" | "immediate_danger" | "created_at" | "updated_at"
>;

// `category` doesn't exist until supabase/migrations/0002_add_report_category.sql
// has been run — same defensive retry as fetchReports() in app/admin/page.tsx,
// kept here too so this page never hard-fails on an unmigrated database.
async function fetchReports(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, type, status, severity, category, immediate_danger, created_at, updated_at")
    .returns<ReportRow[]>();

  if (!error) return data ?? [];

  console.error("[admin analytics] reports query with category failed, retrying without it", error);

  const fallback = await supabase
    .from("reports")
    .select("id, type, status, severity, immediate_danger, created_at, updated_at")
    .returns<Omit<ReportRow, "category">[]>();

  if (fallback.error) {
    console.error("[admin analytics] fallback query also failed", fallback.error);
    return [];
  }

  return (fallback.data ?? []).map((r) => ({ ...r, category: null }));
}

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  social: "Social",
  cyber: "Cyber",
  verbal: "Verbal",
  physical: "Physical",
  conflict: "Conflict",
};

// Matches the hues used for category pills elsewhere (CATEGORY_STYLES in
// components/case-overview-table.tsx: violet/red/amber/blue/accent).
const CATEGORY_BAR_COLORS: Record<ReportCategory, string> = {
  social: "#8b5cf6",
  cyber: "var(--color-danger-500)",
  verbal: "var(--color-accent-500)",
  physical: "var(--color-primary-500)",
  conflict: "var(--color-accent-700)",
};

const CATEGORY_ORDER: ReportCategory[] = ["social", "cyber", "verbal", "physical", "conflict"];

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  minor: "Minor",
  less_serious: "Less serious",
  serious: "Serious",
  critical: "Critical",
};

const SEVERITY_BAR_COLORS: Record<SeverityLevel, string> = {
  minor: "var(--color-primary-500)",
  less_serious: "var(--color-accent-400)",
  serious: "var(--color-danger-500)",
  critical: "var(--color-danger-700)",
};

const SEVERITY_ORDER: SeverityLevel[] = ["minor", "less_serious", "serious", "critical"];

const STATUS_LABELS: Record<ReportStatus, string> = {
  unresolved: "Unresolved",
  in_process: "In progress",
  resolved: "Resolved",
};

const STATUS_BAR_COLORS: Record<ReportStatus, string> = {
  unresolved: "var(--color-accent-500)",
  in_process: "var(--color-primary-500)",
  resolved: "#22c55e",
};

const STATUS_ORDER: ReportStatus[] = ["unresolved", "in_process", "resolved"];

const WEEKS_TO_SHOW = 8;

// Counts per known key only — callers handle the "no value set" (null)
// case separately, since each caller labels it differently ("Pending").
function computeCounts<T extends string>(
  reports: ReportRow[],
  order: T[],
  getKey: (r: ReportRow) => T | null,
): { key: T; count: number }[] {
  const counts = new Map<T, number>(order.map((k) => [k, 0]));
  for (const r of reports) {
    const key = getKey(r);
    if (key !== null) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return order.map((key) => ({ key, count: counts.get(key) ?? 0 }));
}

function weekStart(date: Date): Date {
  const d = new Date(date);
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeWeeklyTrend(reports: ReportRow[]) {
  const now = new Date();
  const thisWeekStart = weekStart(now);
  const weeks = Array.from({ length: WEEKS_TO_SHOW }, (_, i) => {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - (WEEKS_TO_SHOW - 1 - i) * 7);
    return start;
  });

  return weeks.map((start, i) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inWeek = reports.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    const label =
      i === weeks.length - 1
        ? "This wk"
        : start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return {
      label,
      bully: inWeek.filter((r) => r.type === "bully").length,
      conflict: inWeek.filter((r) => r.type === "conflict").length,
    };
  });
}

export default async function AdminAnalyticsPage() {
  await requireProfile("admin");
  const supabase = await createClient();

  const reports = await fetchReports(supabase);

  const total = reports.length;
  const flagged = reports.filter((r) => r.immediate_danger).length;
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;

  const resolutionDurations = reports
    .filter((r) => r.status === "resolved")
    .map((r) => (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000));
  const avgResolutionDays = resolutionDurations.length
    ? resolutionDurations.reduce((sum, d) => sum + d, 0) / resolutionDurations.length
    : null;

  const categoryCounts = computeCounts(reports, CATEGORY_ORDER, (r) => r.category);
  const uncategorizedCount = reports.filter((r) => !r.category).length;
  const categoryMax = Math.max(1, ...categoryCounts.map((c) => c.count), uncategorizedCount);

  const severityCounts = computeCounts(reports, SEVERITY_ORDER, (r) => r.severity);
  const pendingSeverityCount = reports.filter((r) => !r.severity).length;
  const severityMax = Math.max(1, ...severityCounts.map((c) => c.count), pendingSeverityCount);

  const statusCounts = computeCounts(reports, STATUS_ORDER, (r) => r.status);
  const statusMax = Math.max(1, ...statusCounts.map((c) => c.count));

  const weeklyTrend = computeWeeklyTrend(reports);
  const weeklyMax = Math.max(1, ...weeklyTrend.flatMap((w) => [w.bully, w.conflict]));

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Trends and breakdowns across every report." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total reports" value={String(total)} />
        <StatCard label="Flagged" value={String(flagged)} valueClassName={flagged > 0 ? "text-[var(--color-danger-500)]" : ""} />
        <StatCard label="Resolution rate" value={`${resolutionRate}%`} valueClassName="text-green-400" />
        <StatCard
          label="Avg. resolution"
          value={avgResolutionDays === null ? "—" : `${avgResolutionDays.toFixed(1)} days`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">By category</h2>
          <BarRow
            bars={[
              ...categoryCounts.map((c) => ({
                label: CATEGORY_LABELS[c.key],
                value: c.count,
                color: CATEGORY_BAR_COLORS[c.key],
              })),
              ...(uncategorizedCount > 0
                ? [{ label: "Pending", value: uncategorizedCount, color: "var(--color-text-muted)" }]
                : []),
            ]}
            max={categoryMax}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">By severity</h2>
          <BarRow
            bars={[
              ...severityCounts.map((c) => ({
                label: SEVERITY_LABELS[c.key],
                value: c.count,
                color: SEVERITY_BAR_COLORS[c.key],
              })),
              ...(pendingSeverityCount > 0
                ? [{ label: "Pending", value: pendingSeverityCount, color: "var(--color-text-muted)" }]
                : []),
            ]}
            max={severityMax}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">By status</h2>
          <BarRow
            bars={statusCounts.map((c) => ({
              label: STATUS_LABELS[c.key],
              value: c.count,
              color: STATUS_BAR_COLORS[c.key],
            }))}
            max={statusMax}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Reports over time</h2>
          <div className="mb-3 flex items-center justify-end gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--color-primary-500)]" />
              Bully
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent-500)]" />
              Conflict
            </span>
          </div>
          <div className="flex h-32 items-end justify-between gap-2">
            {weeklyTrend.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end justify-center gap-1">
                  <div
                    className="w-2.5 rounded-t bg-[var(--color-primary-500)]"
                    style={{ height: `${(w.bully / weeklyMax) * 100}%`, minHeight: w.bully > 0 ? "2px" : 0 }}
                  />
                  <div
                    className="w-2.5 rounded-t bg-[var(--color-accent-500)]"
                    style={{ height: `${(w.conflict / weeklyMax) * 100}%`, minHeight: w.conflict > 0 ? "2px" : 0 }}
                  />
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)]">{w.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {total === 0 && (
        <Card className="mt-6">
          <p className="text-[var(--color-text-muted)]">No reports yet — charts will fill in as they come in.</p>
        </Card>
      )}
    </div>
  );
}

function BarRow({ bars, max }: { bars: { label: string; value: number; color: string }[]; max: number }) {
  return (
    <div className="space-y-3">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-3">
          <span className="w-20 flex-shrink-0 text-sm text-[var(--color-text-muted)]">{bar.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-background)]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(bar.value / max) * 100}%`, backgroundColor: bar.color }}
            />
          </div>
          <span className="w-6 flex-shrink-0 text-right text-sm font-medium">{bar.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClassName}`}>{value}</p>
    </Card>
  );
}
