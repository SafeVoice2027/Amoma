import Link from "next/link";
import { Card, StatusBadge } from "@/components/ui";
import type { ReportStatus, ReportType, SeverityLevel } from "@/types/database";

export interface SeverityBoardRow {
  id: string;
  caseId: string;
  type: ReportType;
  status: ReportStatus;
  severity: SeverityLevel | null;
  isAnonymous: boolean;
  createdAt: string;
}

// Handlers and Admin triage by urgency, not chronology — the Critical /
// Serious / Minor split used here folds `less_serious` into Minor (it's
// already vestigial: lib/ai/severity.ts's classifier never emits it, see
// the comment there) rather than adding a fourth column for a value the
// app no longer produces.
const BUCKETS: { key: "critical" | "serious" | "minor" | "pending"; title: string; match: (s: SeverityLevel | null) => boolean }[] = [
  { key: "critical", title: "Critical — needs immediate attention", match: (s) => s === "critical" },
  { key: "serious", title: "Serious", match: (s) => s === "serious" },
  { key: "minor", title: "Minor", match: (s) => s === "minor" || s === "less_serious" },
  { key: "pending", title: "Pending AI review", match: (s) => s === null },
];

export function SeverityReportBoard({ rows, hrefBase }: { rows: SeverityBoardRow[]; hrefBase: string }) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-[var(--color-text-muted)]">No reports yet for your school.</p>
      </Card>
    );
  }

  return (
    <div>
      {BUCKETS.map((bucket) => {
        const group = rows.filter((r) => bucket.match(r.severity));
        if (group.length === 0) return null;
        return (
          <div key={bucket.key} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">{bucket.title}</h2>
            <div className="space-y-3">
              {group.map((r) => (
                <Link key={r.id} href={`${hrefBase}/${r.id}`}>
                  <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
                    <div>
                      <p className="font-medium">
                        {r.caseId} · {r.type === "bully" ? "Bullying report" : "Conflict report"}
                        {r.isAnonymous && (
                          <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                            Anonymous
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
