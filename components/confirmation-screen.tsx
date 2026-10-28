import Link from "next/link";
import { AlertTriangle, CheckCircle2, Eye, Hash, Home, ArrowRight } from "lucide-react";

import { Card } from "@/components/ui";
import { useT } from "@/components/i18n-provider";

export function ConfirmationScreen({ urgent, caseId }: { urgent: boolean; caseId: string }) {
  const { t } = useT();
  const steps = [t("cf.s1"), t("cf.s2"), t("cf.s3"), urgent ? t("cf.s4urgent") : t("cf.s4")];

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex flex-col items-center text-center">
        <div
          className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${
            urgent ? "bg-[var(--color-danger-600)]" : "bg-[var(--color-primary-600)]"
          }`}
        >
          {urgent ? (
            <AlertTriangle className="h-7 w-7 text-white" strokeWidth={2} />
          ) : (
            <CheckCircle2 className="h-7 w-7 text-white" strokeWidth={2} />
          )}
        </div>
        <h1 className="text-xl font-semibold">
          {t("cf.submitted")}
          {urgent ? t("cf.urgentSuffix") : ""}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {urgent ? t("cf.subUrgent") : t("cf.sub")}
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--color-primary-800)]">
          <Hash size={14} />
          {t("cf.number")}
        </div>
        <p className="mt-1 text-2xl font-bold tracking-wide text-[var(--color-primary-800)]">{caseId}</p>
        <p className="mt-1 text-sm text-[color-mix(in_srgb,var(--color-primary-800)_75%,transparent)]">
          {t("cf.numberNote")}
        </p>
      </div>

      <Card className="mt-4 text-left">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Eye size={16} />
          {t("cf.next")}
        </div>
        <ol className="space-y-3">
          {steps.map((text, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-xs font-semibold text-[var(--color-primary-700)]">
                {i + 1}
              </span>
              <span className="text-[var(--color-text-muted)]">{text}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="mt-6">
        <Link
          href="/student"
          className="block rounded-2xl border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
              <Home size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[var(--color-accent-800)]">{t("cf.home")}</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {t("cf.homeSub")}
              </p>
            </div>
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-500)] text-white">
              <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
