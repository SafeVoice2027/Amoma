"use client";

import { useState } from "react";
import { HeartHandshake, AlertTriangle, CheckCircle2, Lock, Phone } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { SCHOOL_PHONE } from "@/lib/school-contact";
import { PD_1727_URL } from "@/lib/legal-links";
import { useT } from "@/components/i18n-provider";

// Step 1 of the Bully report flow. A "No" answer just
// moves the wizard forward; a "Yes" answer takes over the screen with a
// crisis-resources overlay whose numbers are real `tel:` links before the
// student can continue.
export function DangerCheck({ onContinue }: { onContinue: (inDanger: boolean) => void }) {
  const { t } = useT();
  const [showEmergency, setShowEmergency] = useState(false);
  // Tapping "Yes" shows a false-report warning (PD 1727) first, every time,
  // before the emergency screen. "No" goes straight on to the report.
  const [showWarning, setShowWarning] = useState(false);

  return (
    <>
      <Card>
        <div className="-mx-6 -mt-6 mb-5 rounded-t-2xl bg-[var(--color-danger-50)] px-6 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger-100)] text-[var(--color-danger-600)]">
            <HeartHandshake size={22} />
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-danger-700)]">{t("dc.title")}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t("dc.intro")}
          </p>
        </div>

        <h2 className="text-base font-semibold">{t("dc.question")}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t("dc.questionSub")}
        </p>
        <p className="mt-2 rounded-lg bg-[var(--color-background)] px-3 py-2 text-xs leading-snug text-[var(--color-text-muted)]">
          {t("dc.dangerDefinition")}
        </p>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => setShowWarning(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-danger-300)] bg-[var(--color-danger-50)] px-4 py-4 text-left transition-colors hover:bg-[var(--color-danger-100)]"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-danger-100)] text-[var(--color-danger-600)]">
              <AlertTriangle size={20} />
            </span>
            <span>
              <span className="block font-semibold text-[var(--color-danger-700)]">
                {t("dc.yes")}
              </span>
              <span className="block text-sm text-[var(--color-text-muted)]">
                {t("dc.yesSub")}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onContinue(false)}
            className="flex w-full items-center gap-3 rounded-xl border border-green-300 bg-green-50 px-4 py-4 text-left transition-colors hover:bg-green-100"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={20} />
            </span>
            <span>
              <span className="block font-semibold text-green-700">{t("dc.no")}</span>
              <span className="block text-sm text-[var(--color-text-muted)]">
                {t("dc.noSub")}
              </span>
            </span>
          </button>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--color-primary-100)_60%,transparent)] p-3 text-xs text-[var(--color-primary-800)]">
          <Lock size={14} className="mt-0.5 flex-shrink-0" />
          <span>{t("dc.protected")}</span>
        </div>
      </Card>

      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
              <AlertTriangle size={26} />
            </div>
            <h2 className="text-xl font-semibold">{t("dc.warnTitle")}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {/* The text marks the decree's name with [[...]] — render it as a link to the full law. */}
              {t("dc.warnBody")
                .split(/(\[\[.+?\]\])/)
                .map((part, i) =>
                  part.startsWith("[[") ? (
                    <a
                      key={i}
                      href={PD_1727_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--color-brand)] underline"
                    >
                      {part.slice(2, -2)}
                    </a>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
            </p>

            <Button
              className="mt-6 w-full"
              onClick={() => {
                setShowWarning(false);
                setShowEmergency(true);
              }}
            >
              {t("dc.warnOk")}
            </Button>
            <button
              type="button"
              onClick={() => setShowWarning(false)}
              className="mt-3 text-sm font-medium text-[var(--color-text-muted)] underline"
            >
              {t("dc.goBack")}
            </button>
          </Card>
        </div>
      )}

      {showEmergency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm border-[var(--color-danger-300)] text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-danger-100)] text-[var(--color-danger-600)]">
              <HeartHandshake size={26} />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-danger-700)]">{t("dc.notAlone")}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {t("dc.urgent")}
            </p>

            <a
              href={`tel:${SCHOOL_PHONE}`}
              className="mt-5 flex items-center gap-3 rounded-xl border border-[var(--color-danger-300)] bg-[var(--color-danger-50)] px-4 py-3 text-left hover:bg-[var(--color-danger-100)]"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-danger-600)]">
                <Phone size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--color-danger-700)]">{t("dc.schoolNumber")}</span>
                <span className="block text-xs text-[var(--color-text-muted)]">{t("dc.schoolNumberSub")}</span>
              </span>
              <span className="flex-shrink-0 font-semibold text-[var(--color-danger-700)]">{SCHOOL_PHONE}</span>
            </a>

            <Button variant="danger" className="mt-6 w-full" onClick={() => onContinue(true)}>
              {t("dc.continue")}
            </Button>
            <button
              type="button"
              onClick={() => setShowEmergency(false)}
              className="mt-3 text-sm font-medium text-[var(--color-text-muted)] underline"
            >
              {t("dc.goBack")}
            </button>
          </Card>
        </div>
      )}
    </>
  );
}
