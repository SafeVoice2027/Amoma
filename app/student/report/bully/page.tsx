"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  FileText,
  Users,
  MapPin,
  Paperclip,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  ImagePlus,
  UsersRound,
  Smartphone,
  Hand,
  MessageCircle,
} from "lucide-react";
import { DangerCheck } from "@/components/danger-check";
import { ConfirmationScreen } from "@/components/confirmation-screen";
import { Button, Card } from "@/components/ui";
import { WizardHeader, SectionIcon } from "@/components/wizard-header";
import { FieldLabel, inputClass } from "@/components/wizard";
import { submitBullyReport } from "@/app/student/report/actions";
import { formatCaseId } from "@/lib/reports/case-id";
import type { ReportCategory } from "@/types/database";

const TOTAL_STEPS = 6;
const SECTION_LABELS = [
  "Safety Check",
  "What Happened",
  "Who Was Involved",
  "Location & Time",
  "Evidence",
  "Review & Submit",
];

const FREQUENCY_OPTIONS: { value: "one_time" | "a_few_times" | "ongoing"; label: string }[] = [
  { value: "one_time", label: "One time" },
  { value: "a_few_times", label: "A few times" },
  { value: "ongoing", label: "Ongoing / regularly" },
];

const BULLY_TYPE_OPTIONS: { value: ReportCategory; label: string; description: string; icon: typeof Users }[] = [
  { value: "social", label: "Social", description: "Exclusion, rumors, embarrassment", icon: UsersRound },
  { value: "cyber", label: "Cyber", description: "Online, texts, social media", icon: Smartphone },
  { value: "physical", label: "Physical", description: "Hitting, pushing, damaging things", icon: Hand },
  { value: "verbal", label: "Verbal", description: "Name-calling, insults, threats", icon: MessageCircle },
];

interface FormState {
  inImmediateDanger: boolean;
  description: string;
  bullyType: "" | ReportCategory;
  additionalNote: string;
  offenderDescription: string;
  happenedBefore: "" | "yes" | "no" | "unsure";
  frequency: "" | "one_time" | "a_few_times" | "ongoing";
  location: string;
  occurredAt: string;
  witnesses: string;
  evidence: File[];
  isAnonymous: boolean;
}

const initialState: FormState = {
  inImmediateDanger: false,
  description: "",
  bullyType: "",
  additionalNote: "",
  offenderDescription: "",
  happenedBefore: "",
  frequency: "",
  location: "",
  occurredAt: "",
  witnesses: "",
  evidence: [],
  isAnonymous: false,
};

export default function BullyReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ id: string; createdAt: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => {
    if (step === 0) {
      router.push("/student");
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = () => {
    setError(null);
    const formData = new FormData();
    formData.set("in_immediate_danger", String(form.inImmediateDanger));
    formData.set("is_anonymous", String(form.isAnonymous));
    formData.set("description", form.description);
    formData.set("bully_type", form.bullyType);
    formData.set("additional_note", form.additionalNote);
    formData.set("offender_description", form.offenderDescription);
    formData.set("happened_before", form.happenedBefore);
    formData.set("frequency", form.frequency);
    formData.set("location", form.location);
    formData.set("occurred_at", form.occurredAt);
    formData.set("witnesses", form.witnesses);
    form.evidence.forEach((file) => formData.append("evidence", file));

    startTransition(async () => {
      const result = await submitBullyReport(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSubmitted({ id: result.id, createdAt: result.createdAt });
    });
  };

  if (submitted) {
    return (
      <ConfirmationScreen
        urgent={form.inImmediateDanger}
        caseId={formatCaseId(submitted.id, submitted.createdAt)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <WizardHeader
        title="Bully Report"
        sectionLabel={SECTION_LABELS[step]}
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        urgent={form.inImmediateDanger}
        onBack={back}
      />

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
          <SectionIcon icon={<FileText size={20} />} title="What Happened?" />

          <FieldLabel>What type of bullying was this?</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {BULLY_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = form.bullyType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, bullyType: opt.value }))}
                  className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? "border-[var(--color-brand)] bg-[var(--color-primary-50)]"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      active
                        ? "bg-[var(--color-primary-600)] text-white"
                        : "bg-[var(--color-background)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{opt.description}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <FieldLabel>Describe what happened in your own words.</FieldLabel>
            <textarea
              className={`${inputClass} min-h-[9rem]`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={
                'Example: "During lunch break on Tuesday, a classmate kept taking my food and calling me names in front of others..."'
              }
            />
            <p className="mt-1 text-right text-xs text-[var(--color-text-muted)]">
              {form.description.length} chars
            </p>
          </div>

          <div className="mt-4 rounded-xl bg-[var(--color-primary-50)] p-4 text-sm">
            <p className="mb-2 font-medium text-[var(--color-primary-800)]">Helpful tips</p>
            <ul className="list-disc space-y-1 pl-5 text-[var(--color-text-muted)]">
              <li>What exactly was said or done?</li>
              <li>How did it make you or others feel?</li>
              <li>Were there other people nearby?</li>
              <li>Share as much or as little detail as you&apos;re comfortable with</li>
              <li>Were you hurt in any way, even a little?</li>
            </ul>
          </div>

          <Button
            className="mt-6 w-full"
            onClick={next}
            disabled={!form.description.trim() || !form.bullyType}
          >
            Continue
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <SectionIcon
            icon={<Users size={20} />}
            title="Who Was Involved?"
            subtitle={`You can use a name, description, or say "I don't know their name." This will not be shown to anyone without your consent.`}
          />

          <FieldLabel>Person(s) involved</FieldLabel>
          <textarea
            className={inputClass}
            value={form.offenderDescription}
            onChange={(e) => setForm((f) => ({ ...f, offenderDescription: e.target.value }))}
            placeholder={`e.g. "A classmate named Carlo" or "I don't know their name, but they're in Grade 7"`}
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Optional — leave blank if you&apos;re unsure.
          </p>

          <div className="mt-5">
            <FieldLabel>Has this happened before with this person?</FieldLabel>
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">
              Repetition is a key marker that distinguishes bullying from a one-time conflict.
            </p>
            <div className="flex gap-2">
              {(
                [
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "unsure", label: "Not sure" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, happenedBefore: opt.value, frequency: opt.value === "yes" ? f.frequency : "" }))}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    form.happenedBefore === opt.value
                      ? "border-[var(--color-brand)] bg-[var(--color-primary-50)] text-[var(--color-primary-800)]"
                      : "border-[var(--color-border)] text-[var(--color-text)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.happenedBefore === "yes" && (
            <div className="mt-5">
              <FieldLabel>How often does this happen?</FieldLabel>
              <div className="space-y-2">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                      form.frequency === opt.value
                        ? "border-[var(--color-brand)] bg-[var(--color-primary-50)]"
                        : "border-[var(--color-border)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      checked={form.frequency === opt.value}
                      onChange={() => setForm((f) => ({ ...f, frequency: opt.value }))}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button className="mt-6 w-full" onClick={next}>
            Continue
          </Button>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <SectionIcon
            icon={<MapPin size={20} />}
            title="Location & Time"
            subtitle="Help us understand where and when this happened."
          />

          <FieldLabel>Where did it happen?</FieldLabel>
          <input
            className={inputClass}
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder={`e.g. "Classroom 7-B", "School hallway near the gym"`}
          />

          <div className="mt-4">
            <FieldLabel>When did it happen?</FieldLabel>
            <input
              type="date"
              className={inputClass}
              value={form.occurredAt}
              onChange={(e) => setForm((f) => ({ ...f, occurredAt: e.target.value }))}
            />
          </div>

          <div className="mt-4">
            <FieldLabel>Were there witnesses?</FieldLabel>
            <p className="mb-1 text-xs text-[var(--color-text-muted)]">
              Optional — you can describe them without using names.
            </p>
            <input
              className={inputClass}
              value={form.witnesses}
              onChange={(e) => setForm((f) => ({ ...f, witnesses: e.target.value }))}
              placeholder={`e.g. "Yes, a few classmates were there" or "No, we were alone"`}
            />
          </div>

          <Button className="mt-6 w-full" onClick={next}>
            Continue
          </Button>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <SectionIcon
            icon={<Paperclip size={20} />}
            title="Evidence"
            subtitle="Optional — attach screenshots, photos, or add notes. All files are encrypted and only your counselor can access them."
          />

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] px-4 py-8 text-center">
            <ImagePlus className="text-[var(--color-text-muted)]" size={24} />
            <span className="text-sm font-medium">Tap to attach a photo or file</span>
            <span className="text-xs text-[var(--color-text-muted)]">Screenshots, photos, or documents</span>
            <input
              type="file"
              multiple
              accept="video/*,image/*"
              className="hidden"
              onChange={(e) => setForm((f) => ({ ...f, evidence: Array.from(e.target.files ?? []) }))}
            />
          </label>
          {form.evidence.length > 0 && (
            <ul className="mt-2 text-sm text-[var(--color-text-muted)]">
              {form.evidence.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--color-primary-100)_60%,transparent)] p-3 text-xs text-[var(--color-primary-800)]">
            <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
            <span>
              Files are encrypted at rest. Only your assigned counselor and school admin (for audits) can
              access them.
            </span>
          </div>

          <div className="mt-4">
            <FieldLabel>Additional note (optional)</FieldLabel>
            <textarea
              className={inputClass}
              value={form.additionalNote}
              onChange={(e) => setForm((f) => ({ ...f, additionalNote: e.target.value }))}
              placeholder="Anything else you'd like to add about the evidence..."
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={next} className="text-sm font-medium text-[var(--color-text-muted)] underline">
              Skip this step — I have no evidence
            </button>
            <Button onClick={next}>Continue</Button>
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <SectionIcon
            icon={<CheckCircle2 size={20} />}
            title="Review Your Report"
            subtitle="Please review the details before submitting. You can go back to edit any section."
          />

          {form.inImmediateDanger && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-[var(--color-danger-50)] p-3 text-sm text-[var(--color-danger-700)]">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <span>
                This report is marked <strong>URGENT</strong>. It will be routed to the top of the
                counselor&apos;s queue immediately.
              </span>
            </div>
          )}

          <div className="space-y-2">
            <ReviewRow icon={<FileText size={16} />} label="What Happened" value={form.description} />
            <ReviewRow
              icon={<UsersRound size={16} />}
              label="Type of Bullying"
              value={BULLY_TYPE_OPTIONS.find((o) => o.value === form.bullyType)?.label ?? ""}
            />
            <ReviewRow icon={<Users size={16} />} label="Who Was Involved" value={form.offenderDescription} />
            <ReviewRow
              icon={<History size={16} />}
              label="History & Frequency"
              value={
                form.happenedBefore === "yes"
                  ? `Happened before${form.frequency ? " — " + FREQUENCY_OPTIONS.find((o) => o.value === form.frequency)?.label : ""}`
                  : form.happenedBefore === "no"
                    ? "First time"
                    : form.happenedBefore === "unsure"
                      ? "Not sure"
                      : ""
              }
            />
            <ReviewRow
              icon={<MapPin size={16} />}
              label="Location & Time"
              value={[form.location, form.occurredAt].filter(Boolean).join(" · ")}
            />
            <ReviewRow
              icon={<Paperclip size={16} />}
              label="Evidence"
              value={form.evidence.length ? `${form.evidence.length} file(s) attached` : ""}
            />
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-[var(--color-primary-50)] p-3 text-sm text-[var(--color-primary-800)]">
            <ShieldCheck size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Your Anonymity is Protected</p>
              <p className="mt-0.5 text-[var(--color-text-muted)]">
                Your name and identity will never be shared with teachers or the people named in this
                report. Only the system can trace this report for abuse-prevention purposes, as required
                by RA 10173.
              </p>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isAnonymous}
              onChange={(e) => setForm((f) => ({ ...f, isAnonymous: e.target.checked }))}
            />
            Submit this report anonymously
          </label>

          {error && (
            <p className="mt-3 rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={back} disabled={pending}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={pending}>
              {pending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReviewRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-background)] text-[var(--color-text-muted)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {value ? (
          <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">{value}</p>
        ) : (
          <p className="mt-0.5 text-sm italic text-[var(--color-text-muted)]">Not provided</p>
        )}
      </div>
    </div>
  );
}

