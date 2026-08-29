import type { ReactNode } from "react";
import type { SeverityLevel, ReportStatus } from "@/types/database";

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "warm" | "danger" | "ghost";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 min-h-[3rem] text-base font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    primary: "bg-[var(--color-brand)] text-[var(--color-on-brand)] hover:bg-[var(--color-brand-strong)]",
    secondary:
      "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-background)]",
    warm: "bg-[var(--color-warm)] text-[var(--color-on-warm)] hover:brightness-95",
    danger: "bg-[var(--color-danger-600)] text-white hover:bg-[var(--color-danger-700)]",
    ghost: "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-base leading-7 text-[var(--color-text-muted)]">{subtitle}</p>
      )}
    </div>
  );
}

const severityStyles: Record<SeverityLevel, string> = {
  minor: "bg-primary-100 text-primary-800",
  less_serious: "bg-accent-100 text-accent-800",
  serious: "bg-danger-100 text-danger-700",
  critical: "bg-danger-600 text-white",
};

const severityLabels: Record<SeverityLevel, string> = {
  minor: "Minor",
  less_serious: "Less serious",
  serious: "Serious",
  critical: "Critical",
};

export function SeverityBadge({ severity }: { severity: SeverityLevel | null }) {
  if (!severity) {
    return (
      <span className="inline-flex items-center rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-700">
        Pending review
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${severityStyles[severity]}`}
    >
      {severityLabels[severity]}
    </span>
  );
}

const statusLabels: Record<ReportStatus, string> = {
  unresolved: "Unresolved",
  in_process: "In process",
  resolved: "Resolved",
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-text-muted)]">
      {statusLabels[status]}
    </span>
  );
}
