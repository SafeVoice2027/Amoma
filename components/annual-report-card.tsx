"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Printer, CheckCircle2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { MONTH_LABELS, OverviewBreakdown } from "@/components/overview-breakdown";
import type { AnnualReport } from "@/types/database";

export function AnnualReportCard({
  report,
  markPrinted,
}: {
  report: AnnualReport;
  markPrinted: (id: string) => Promise<{ error: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleMarkPrinted() {
    setError(null);
    startTransition(async () => {
      const result = await markPrinted(report.id);
      if (result.error) setError(result.error);
    });
  }

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Chevron size={18} className="text-[var(--color-text-muted)]" />
          <span className="text-lg font-semibold">{report.year}</span>
          <span className="text-sm text-[var(--color-text-muted)]">
            {report.total_reports} {report.total_reports === 1 ? "report" : "reports"}
          </span>
        </div>
        {report.printed ? (
          <span className="flex items-center gap-1 text-sm text-green-500">
            <CheckCircle2 size={16} />
            Printed{report.printed_at ? ` ${new Date(report.printed_at).toLocaleDateString()}` : ""}
          </span>
        ) : (
          <span className="rounded-full bg-[var(--color-background)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
            Not printed
          </span>
        )}
      </button>

      {open && (
        <div className="mt-5">
          <OverviewBreakdown
            data={{
              total: report.total_reports,
              resolved: report.resolved_count,
              unresolved: report.unresolved_count,
              inProcess: report.in_process_count,
              byBullyingType: report.breakdown_by_bullying_type,
              bySeverity: report.breakdown_by_severity,
            }}
          />

          <h3 className="mb-2 mt-6 font-semibold">By month</h3>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
            {MONTH_LABELS.map((label) => (
              <div key={label} className="rounded-lg border border-[var(--color-border)] p-2 text-center">
                <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                <p className="font-semibold">{report.breakdown_by_month[label] ?? 0}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} />
              Print
            </Button>
            {!report.printed && (
              <Button onClick={handleMarkPrinted} disabled={pending}>
                {pending ? "Saving..." : "Mark as Printed"}
              </Button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-[var(--color-danger-600)]">{error}</p>}
        </div>
      )}
    </Card>
  );
}
