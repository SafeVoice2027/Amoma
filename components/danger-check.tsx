"use client";

import { useState } from "react";
import { HeartHandshake, AlertTriangle, CheckCircle2, Lock, Phone } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { CRISIS_LINES } from "@/lib/crisis-lines";

// Step 1 of both the Bully and Conflict report flows. A "No" answer just
// moves the wizard forward; a "Yes" answer takes over the screen with a
// crisis-resources overlay whose numbers are real `tel:` links before the
// student can continue.
export function DangerCheck({ onContinue }: { onContinue: (inDanger: boolean) => void }) {
  const [showEmergency, setShowEmergency] = useState(false);

  return (
    <>
      <Card>
        <div className="-mx-6 -mt-6 mb-5 rounded-t-2xl bg-[var(--color-danger-50)] px-6 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger-100)] text-[var(--color-danger-600)]">
            <HeartHandshake size={22} />
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-danger-700)]">Safety Check</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Before we begin, we need to make sure you&apos;re safe right now.
          </p>
        </div>

        <h2 className="text-base font-semibold">Is anyone in immediate danger right now?</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          This includes you, the person being bullied, or anyone else involved.
        </p>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => setShowEmergency(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-danger-300)] bg-[var(--color-danger-50)] px-4 py-4 text-left transition-colors hover:bg-[var(--color-danger-100)]"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-danger-100)] text-[var(--color-danger-600)]">
              <AlertTriangle size={20} />
            </span>
            <span>
              <span className="block font-semibold text-[var(--color-danger-700)]">
                Yes, someone is in danger
              </span>
              <span className="block text-sm text-[var(--color-text-muted)]">
                I&apos;ll see crisis resources immediately
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onContinue(false)}
            className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-left transition-colors hover:bg-[var(--color-background)]"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary-100)_70%,transparent)] text-[var(--color-primary-700)]">
              <CheckCircle2 size={20} />
            </span>
            <span>
              <span className="block font-semibold">No, we are safe right now</span>
              <span className="block text-sm text-[var(--color-text-muted)]">
                Continue to file your report
              </span>
            </span>
          </button>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--color-primary-100)_60%,transparent)] p-3 text-xs text-[var(--color-primary-800)]">
          <Lock size={14} className="mt-0.5 flex-shrink-0" />
          <span>Your identity is protected. Teachers cannot see who submitted this report.</span>
        </div>
      </Card>

      {showEmergency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm border-[var(--color-danger-300)] text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-danger-100)] text-[var(--color-danger-600)]">
              <HeartHandshake size={26} />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-danger-700)]">You&apos;re Not Alone</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Your report is marked URGENT. A counselor will be notified immediately. Here are
              resources available right now:
            </p>

            <ul className="mt-5 space-y-2 text-left">
              {CRISIS_LINES.map((line) => (
                <li key={line.number}>
                  <a
                    href={`tel:${line.number.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-danger-300)] bg-[var(--color-danger-50)] px-4 py-3 hover:bg-[var(--color-danger-100)]"
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-danger-600)]">
                      <Phone size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--color-danger-700)]">
                        {line.label}
                      </span>
                      <span className="block truncate text-xs text-[var(--color-text-muted)]">
                        {line.description}
                      </span>
                    </span>
                    <span className="flex-shrink-0 font-semibold text-[var(--color-danger-700)]">
                      {line.number}
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <Button variant="danger" className="mt-6 w-full" onClick={() => onContinue(true)}>
              Continue Filing Report
            </Button>
            <button
              type="button"
              onClick={() => setShowEmergency(false)}
              className="mt-3 text-sm font-medium text-[var(--color-text-muted)] underline"
            >
              Go back
            </button>
          </Card>
        </div>
      )}
    </>
  );
}
