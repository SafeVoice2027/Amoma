import { Card } from "@/components/ui";

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const BULLYING_TYPE_LABELS: Record<string, string> = {
  verbal: "Verbal",
  cyber: "Cyber",
  physical: "Physical",
  social: "Social",
};
const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical",
  serious: "Serious",
  less_serious: "Less serious",
  minor: "Minor",
};

// Fixed display order so a missing key still shows as 0 instead of silently
// vanishing — "no Cyber reports this month" is information, not an omission.
const BULLYING_TYPE_ORDER = ["verbal", "cyber", "physical", "social"];
const SEVERITY_ORDER = ["critical", "serious", "less_serious", "minor"];

function BreakdownCard({
  title,
  note,
  order,
  labels,
  counts,
}: {
  title: string;
  note?: string;
  order: string[];
  labels: Record<string, string>;
  counts: Record<string, number>;
}) {
  const max = Math.max(1, ...order.map((k) => counts[k] ?? 0));
  return (
    <Card>
      <h3 className="font-semibold">{title}</h3>
      {note && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{note}</p>}
      <div className="mt-3 space-y-2">
        {order.map((key) => {
          const value = counts[key] ?? 0;
          return (
            <div key={key} className="flex items-center gap-3 text-sm">
              <span className="w-24 flex-shrink-0 text-[var(--color-text-muted)]">{labels[key] ?? key}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-background)]">
                <div
                  className="h-full rounded-full bg-[var(--color-brand)]"
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
              <span className="w-8 flex-shrink-0 text-right font-medium">{value}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export interface OverviewData {
  total: number;
  resolved: number;
  unresolved: number;
  inProcess: number;
  byBullyingType: Record<string, number>;
  bySeverity: Record<string, number>;
}

// Shared by the live Monthly Overview and the frozen Annual Report, so both
// read identically. Conflict reports can no longer be filed, so there's no
// Bully-vs-Conflict split to show (annual_reports still stores one).
export function OverviewBreakdown({ data }: { data: OverviewData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Total reports", data.total],
            ["Resolved", data.resolved],
            ["Unresolved", data.unresolved],
            ["In process", data.inProcess],
          ] as const
        ).map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard
          title="By bullying type"
          note="A report with several types counts once under each."
          order={BULLYING_TYPE_ORDER}
          labels={BULLYING_TYPE_LABELS}
          counts={data.byBullyingType}
        />
        <BreakdownCard title="By severity" order={SEVERITY_ORDER} labels={SEVERITY_LABELS} counts={data.bySeverity} />
      </div>
    </div>
  );
}
