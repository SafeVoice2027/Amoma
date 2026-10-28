"use client";

import { Card } from "@/components/ui";
import { useT } from "@/components/i18n-provider";

interface StatusCounts {
  resolved: number;
  in_process: number;
  unresolved: number;
}

// The student's resolution rate: how many of their reports are resolved, with
// a bar per status. (The old "Report Types" weekly chart was removed.)
export function TrendChart({ statusCounts }: { statusCounts: StatusCounts }) {
  const { t } = useT();
  const total = statusCounts.resolved + statusCounts.in_process + statusCounts.unresolved;
  const resolvedPct = total ? Math.round((statusCounts.resolved / total) * 100) : 0;
  const statusMax = Math.max(statusCounts.resolved, statusCounts.in_process, statusCounts.unresolved);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{t("trend.resolution")}</h2>

      <div>
        <p className="text-3xl font-bold text-[var(--color-brand)]">{resolvedPct}%</p>
        <p className="text-sm text-[var(--color-text-muted)]">{t("trend.resolvedPct")}</p>

        <div className="mt-5 flex h-32 items-end justify-center gap-6">
          {(
            [
              { key: "unresolved", label: t("trend.underReview"), value: statusCounts.unresolved, color: "var(--color-accent-500)" },
              { key: "in_process", label: t("trend.ongoing"), value: statusCounts.in_process, color: "var(--color-primary-600)" },
              { key: "resolved", label: t("trend.resolved"), value: statusCounts.resolved, color: "#22c55e" },
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
              <span className="text-center text-[10px] leading-tight text-[var(--color-text-muted)]">
                {bucket.label}
              </span>
            </div>
          ))}
        </div>

        {total === 0 && (
          <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
            {t("trend.none")}
          </p>
        )}
      </div>
    </Card>
  );
}
