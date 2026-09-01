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
// splits into Teacher (this) vs. Handler (staff-handler-home.tsx) views.
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
    <div>
      <PageHeader title={`Welcome, ${firstName}`} subtitle="Here's what needs your attention." />

      <Card className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Why cases are stuck
        </h2>
        <p className="mt-2 text-[var(--color-text)]">{summary}</p>
      </Card>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <TrendTile label="Resolved" value={counts.resolved} />
        <TrendTile label="In process" value={counts.in_process} />
        <TrendTile label="Unresolved" value={counts.unresolved} />
      </div>

      {SEVERITY_ORDER.map((severity) => {
        const group = rows.filter((r) => r.severity === severity);
        if (group.length === 0) return null;
        return (
          <div key={severity ?? "null"} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">{SEVERITY_TITLES[severity ?? "null"]}</h2>
            <div className="space-y-3">
              {group.map((r) => (
                <Link key={r.id} href={`/staff/reports/${r.id}`}>
                  <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
                    <div>
                      <p className="font-medium">
                        {r.type === "bully" ? "Bullying report" : "Conflict report"}
                        {r.isAnonymous && (
                          <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                            Anonymous
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {new Date(r.createdAt).toLocaleString()} · {r.followupCount} follow-up message
                        {r.followupCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
          <p className="text-[var(--color-text-muted)]">No reports yet for your school.</p>
        </Card>
      )}
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
