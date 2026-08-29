"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

interface DayBucket {
  label: string;
  bully: number;
  conflict: number;
}

interface StatusCounts {
  resolved: number;
  in_process: number;
  unresolved: number;
}

export function TrendChart({ days, statusCounts }: { days: DayBucket[]; statusCounts: StatusCounts }) {
  const [tab, setTab] = useState<"types" | "resolution">("types");
  const maxCount = Math.max(1, ...days.flatMap((d) => [d.bully, d.conflict]));
  const total = statusCounts.resolved + statusCounts.in_process + statusCounts.unresolved;
  const resolvedPct = total ? Math.round((statusCounts.resolved / total) * 100) : 0;
  const statusMax = Math.max(statusCounts.resolved, statusCounts.in_process, statusCounts.unresolved);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Trend Insights</h2>

      <div className="mb-4 inline-flex rounded-xl bg-[var(--color-background)] p-1 text-sm">
        <button
          type="button"
          onClick={() => setTab("types")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            tab === "types"
              ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          Report Types
        </button>
        <button
          type="button"
          onClick={() => setTab("resolution")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            tab === "resolution"
              ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          Resolution Rate
        </button>
      </div>

      {tab === "types" ? (
        <div>
          <div className="mb-3 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span>Reports This Week</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[var(--color-primary-600)]" />
                Bully
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent-500)]" />
                Conflict
              </span>
            </span>
          </div>
          <div className="flex h-32 items-end justify-between gap-2">
            {days.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end justify-center gap-1">
                  <div
                    className="w-2.5 rounded-t bg-[var(--color-primary-600)]"
                    style={{ height: `${(d.bully / maxCount) * 100}%` }}
                  />
                  <div
                    className="w-2.5 rounded-t bg-[var(--color-accent-500)]"
                    style={{ height: `${(d.conflict / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)]">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-3xl font-bold text-[var(--color-brand)]">{resolvedPct}%</p>
          <p className="text-sm text-[var(--color-text-muted)]">of your reports have been resolved</p>

          <div className="mt-5 flex h-32 items-end justify-center gap-6">
            {(
              [
                { key: "unresolved", label: "Under Review", value: statusCounts.unresolved, color: "var(--color-accent-500)" },
                { key: "in_process", label: "Ongoing", value: statusCounts.in_process, color: "var(--color-primary-600)" },
                { key: "resolved", label: "Resolved", value: statusCounts.resolved, color: "#22c55e" },
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
              You haven&apos;t submitted any reports yet.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
