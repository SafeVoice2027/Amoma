import Link from "next/link";
import { Card, PageHeader, SeverityBadge, StatusBadge } from "@/components/ui";
import type { SeverityLevel } from "@/types/database";

const SEVERITY_ORDER: (SeverityLevel | null)[] = ["critical", "serious", "less_serious", "minor", null];
const SEVERITY_TITLES: Record<string, string> = {
  critical: "Critical — needs immediate attention",
  serious: "Serious",
  less_serious: "Less serious",
  minor: "Minor",
  null: "Pending AI review",
};

export interface TeacherHomeRow {
  id: string;
  type: "bully" | "conflict";
  status: "unresolved" | "in_process" | "resolved";
  severity: SeverityLevel | null;
  isAnonymous: boolean;
  createdAt: string;
  followupCount: number;
}

// Page A (Teacher): the standard case-count view, unchanged from the
// original Staff home screen — see
// supabase/migrations/0010_handlers_and_teacher_tags.sql for why Staff now
// splits into Teacher (this) vs. Handler (which shares Admin's /admin
// pages). The report list ("task board") lives in a sticky side panel
// rather than stacked below the stats, matching the layout used on the
// shared Admin/Handler dashboard.
export function StaffTeacherHome({
  firstName,
  summary,
  counts,
  rows,
}: {
  firstName: string;
  summary: string;
  counts: { resolved: number; in_process: number; unresolved: number };
  rows: TeacherHomeRow[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <div>
        <PageHeader title={`Welcome, ${firstName}`} subtitle="Here's what needs your attention." />

        <Card className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Why cases are stuck
          </h2>
          <p className="mt-2 text-[var(--color-text)]">{summary}</p>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <TrendTile label="Resolved" value={counts.resolved} />
          <TrendTile label="In process" value={counts.in_process} />
          <TrendTile label="Unresolved" value={counts.unresolved} />
        </div>
      </div>

      <div className="xl:sticky xl:top-8">
        <h2 className="mb-4 text-lg font-semibold">Your task board</h2>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
          {SEVERITY_ORDER.map((severity) => {
            const group = rows.filter((r) => r.severity === severity);
            if (group.length === 0) return null;
            return (
              <div key={severity ?? "null"} className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">
                  {SEVERITY_TITLES[severity ?? "null"]}
                </h3>
                <div className="space-y-2">
                  {group.map((r) => (
                    <Link key={r.id} href={`/staff/reports/${r.id}`}>
                      <Card className="!p-3 transition-shadow hover:shadow-md">
                        <p className="text-sm font-medium">
                          {r.type === "bully" ? "Bullying report" : "Conflict report"}
                          {r.isAnonymous && (
                            <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)]">
                              Anonymous
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                          {new Date(r.createdAt).toLocaleDateString()} · {r.followupCount}{" "}
                          {r.followupCount === 1 ? "reply" : "replies"}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <StatusBadge status={r.status} />
                          <SeverityBadge severity={r.severity} />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <Card>
              <p className="text-sm text-[var(--color-text-muted)]">No reports yet for your school.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="text-center">
      <p className="text-2xl font-semibold text-[var(--color-brand)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{label}</p>
    </Card>
  );
}
