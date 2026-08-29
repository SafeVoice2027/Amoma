import { ArrowLeft, AlertTriangle } from "lucide-react";

export function WizardHeader({
  title,
  sectionLabel,
  currentStep,
  totalSteps,
  urgent,
  onBack,
}: {
  title: string;
  sectionLabel: string;
  currentStep: number;
  totalSteps: number;
  urgent: boolean;
  onBack: () => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold">{title}</h1>
        {urgent ? (
          <span className="flex items-center gap-1 rounded-full bg-[var(--color-danger-100)] px-2.5 py-1 text-xs font-semibold text-[var(--color-danger-700)]">
            <AlertTriangle size={12} />
            URGENT
          </span>
        ) : (
          <span className="w-9" />
        )}
      </div>

      <p className="mt-3 text-center text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        Step {currentStep + 1} of {totalSteps}
      </p>

      <div className="mt-3 flex justify-center gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full ${
              i <= currentStep ? "bg-[var(--color-brand)]" : "bg-[var(--color-border)]"
            }`}
          />
        ))}
      </div>

      <p className="mt-3 text-center text-sm font-medium text-[var(--color-text)]">{sectionLabel}</p>
    </div>
  );
}

export function SectionIcon({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
      </div>
    </div>
  );
}
