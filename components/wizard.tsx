import type { ReactNode } from "react";

export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-6 flex gap-2" aria-label={`Step ${step + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full ${
            i <= step ? "bg-[var(--color-brand)]" : "bg-[var(--color-border)]"
          }`}
        />
      ))}
    </div>
  );
}

export function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="step-flow">
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle && <p className="mt-2 text-[var(--color-text-muted)]">{subtitle}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-sm font-medium">{children}</label>;
}

export const inputClass =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base outline-none focus:border-[var(--color-brand)] min-h-[3rem]";
