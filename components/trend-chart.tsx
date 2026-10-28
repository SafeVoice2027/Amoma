"use client";

import { Card } from "@/components/ui";
import { useT } from "@/components/i18n-provider";

interface StatusCounts {
  resolved: number;
  in_process: number;
  unresolved: number;
}

// All reports at the student's school. `enough: false` means the school has
// fewer than 10 reports, so the database withholds the numbers (see
// supabase/migrations/0032_school_resolution_stats.sql). `null` = not available
// (that migration hasn't run), in which case the school block is left out.
export type SchoolStats =
  | { enough: true; counts: StatusCounts }
  | { enough: false }
  | null;

// Resolution rate: the percentage resolved, with a bar per status.
function RateBlock({
  title,
  caption,
  counts,
  emptyText,
}: {
  title: string;
  caption: string;
  counts: StatusCounts;
  emptyText?: string;
}) {
  const { t } = useT();
  const total = counts.resolved + counts.in_process + counts.unresolved;
  const resolvedPct = total ? Math.round((counts.resolved / total) * 100) : 0;
  const statusMax = Math.max(counts.resolved, counts.in_process, counts.unresolved);

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--color-text-muted)]">{title}</h3>
      <p className="mt-1 text-3xl font-bold text-[var(--color-brand)]">{resolvedPct}%</p>
      <p className="text-sm text-[var(--color-text-muted)]">{caption}</p>

      <div className="mt-5 flex h-32 items-end justify-center gap-6">
        {(
          [
            { key: "unresolved", label: t("trend.underReview"), value: counts.unresolved, color: "var(--color-accent-500)" },
            { key: "in_process", label: t("trend.ongoing"), value: counts.in_process, color: "var(--color-primary-600)" },
            { key: "resolved", label: t("trend.resolved"), value: counts.resolved, color: "#22c55e" },
          ] as const
        ).map((bucket) => (
          <div key={bucket.key} className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold">{bucket.value}</span>
            <div className="flex h-24 w-9 items-end">
              <div
                className="w-full rounded-t"
                style={{
                  height: `${statusMax ? (bucket.value / statusMax) * 100 : 0}%`,
                  minHeight: bucket.value > 0 ? "4px" : 0,
                  backgroundColor: bucket.color,
                }}
              />
            </div>
            <span className="text-center text-[10px] leading-tight text-[var(--color-text-muted)]">{bucket.label}</span>
          </div>
        ))}
      </div>

      {total === 0 && emptyText && (
        <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">{emptyText}</p>
      )}
    </div>
  );
}

export function TrendChart({ statusCounts, schoolStats }: { statusCounts: StatusCounts; schoolStats: SchoolStats }) {
  const { t } = useT();

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{t("trend.resolution")}</h2>

      <RateBlock
        title={t("trend.mine")}
        caption={t("trend.resolvedPct")}
        counts={statusCounts}
        emptyText={t("trend.none")}
      />

      {schoolStats && (
        <div className="mt-6 border-t border-[var(--color-border)] pt-6">
          {schoolStats.enough ? (
            <RateBlock title={t("trend.school")} caption={t("trend.schoolResolvedPct")} counts={schoolStats.counts} />
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)]">{t("trend.school")}</h3>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("trend.schoolNotEnough")}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
