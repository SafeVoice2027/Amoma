"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DangerCheck } from "@/components/danger-check";
import { Button, Card } from "@/components/ui";
import { StepProgress, StepShell, inputClass } from "@/components/wizard";
import { submitConflictReport } from "@/app/student/report/actions";

const TOTAL_STEPS = 4;

interface FormState {
  inImmediateDanger: boolean;
  conflictReason: string;
  dominantPartyDescription: string;
  wantsSolution: boolean;
  wantsBreathingExercise: boolean;
  isAnonymous: boolean;
}

const initialState: FormState = {
  inImmediateDanger: false,
  conflictReason: "",
  dominantPartyDescription: "",
  wantsSolution: true,
  wantsBreathingExercise: false,
  isAnonymous: false,
};

export default function ConflictReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    setError(null);
    const formData = new FormData();
    formData.set("in_immediate_danger", String(form.inImmediateDanger));
    formData.set("is_anonymous", String(form.isAnonymous));
    formData.set("conflict_reason", form.conflictReason);
    formData.set("dominant_party_description", form.dominantPartyDescription);
    formData.set("wants_solution", String(form.wantsSolution));
    formData.set("wants_breathing_exercise", String(form.wantsBreathingExercise));

    startTransition(async () => {
      const result = await submitConflictReport(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="mx-auto max-w-xl">
      <StepProgress step={step} total={TOTAL_STEPS} />

      {step === 0 && (
        <DangerCheck
          onContinue={(inDanger) => {
            setForm((f) => ({ ...f, inImmediateDanger: inDanger }));
            next();
          }}
        />
      )}

      {step === 1 && (
        <Card>
          <StepShell
            title="What's going on?"
            subtitle="Help us understand the situation. Is anyone dominating or escalating it?"
          >
            <textarea
              className={`${inputClass} min-h-[10rem]`}
              value={form.conflictReason}
              onChange={(e) => setForm((f) => ({ ...f, conflictReason: e.target.value }))}
              placeholder="What's the conflict about?"
            />
            <textarea
              className={inputClass}
              value={form.dominantPartyDescription}
              onChange={(e) => setForm((f) => ({ ...f, dominantPartyDescription: e.target.value }))}
              placeholder="Is anyone dominating or escalating it? (optional)"
            />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={back}>
                Back
              </Button>
              <Button type="button" onClick={next} disabled={!form.conflictReason.trim()}>
                Next
              </Button>
            </div>
          </StepShell>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <StepShell title="What kind of support would help?" subtitle="Choose whatever sounds useful — you can pick both.">
            <div className="space-y-3">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                  form.wantsSolution ? "border-[var(--color-brand)] bg-[var(--color-primary-50)]" : "border-[var(--color-border)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.wantsSolution}
                  onChange={(e) => setForm((f) => ({ ...f, wantsSolution: e.target.checked }))}
                />
                A suggested way to resolve it
              </label>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                  form.wantsBreathingExercise ? "border-[var(--color-brand)] bg-[var(--color-primary-50)]" : "border-[var(--color-border)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.wantsBreathingExercise}
                  onChange={(e) => setForm((f) => ({ ...f, wantsBreathingExercise: e.target.checked }))}
                />
                Breathing or calming exercises
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={back}>
                Back
              </Button>
              <Button type="button" onClick={next}>
                Next
              </Button>
            </div>
          </StepShell>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <StepShell title="Review your report" subtitle="Confirm everything looks right before submitting.">
            <ReviewRow label="Immediate danger" value={form.inImmediateDanger ? "Yes" : "No"} />
            <ReviewRow label="What's going on" value={form.conflictReason} />
            <ReviewRow label="Dominating / escalating" value={form.dominantPartyDescription || "—"} />
            <ReviewRow
              label="Support wanted"
              value={
                [form.wantsSolution && "Suggested resolution", form.wantsBreathingExercise && "Calming exercises"]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isAnonymous}
                onChange={(e) => setForm((f) => ({ ...f, isAnonymous: e.target.checked }))}
              />
              Submit this report anonymously
            </label>

            {error && (
              <p className="rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={back} disabled={pending}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={pending}>
                {pending ? "Submitting..." : "Submit report"}
              </Button>
              <Button variant="ghost" onClick={() => router.push("/student")} disabled={pending}>
                Cancel
              </Button>
            </div>
          </StepShell>
        </Card>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--color-border)] py-2 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="max-w-[60%] text-right">{value}</span>
    </div>
  );
}
