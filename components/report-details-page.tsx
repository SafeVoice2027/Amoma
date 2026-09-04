"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Users,
  MapPin,
  Paperclip,
  CheckCircle2,
  ImagePlus,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { DangerCheck } from "@/components/danger-check";
import { ConfirmationScreen } from "@/components/confirmation-screen";
import { Button, Card } from "@/components/ui";
import { SectionIcon } from "@/components/wizard-header";
import { FieldLabel, inputClass } from "@/components/wizard";
import { submitBullyReport } from "@/app/student/report/actions";
import { formatCaseId } from "@/lib/reports/case-id";
import { BULLYING_TYPE_OPTIONS } from "@/lib/reports/bullying-types";
import type { BullyingType } from "@/types/database";

interface FormState {
  inImmediateDanger: boolean;
  description: string;
  bullyingTypes: BullyingType[];
  victimGradeSection: string;
  oppressorGradeSection: string;
  oppressorName: string;
  setting: string;
  evidence: File[];
  isAnonymous: boolean;
}

const initialState: FormState = {
  inImmediateDanger: false,
  description: "",
  bullyingTypes: [],
  victimGradeSection: "",
  oppressorGradeSection: "",
  oppressorName: "",
  setting: "",
  evidence: [],
  isAnonymous: false,
};

const COPY = {
  pageTitle: "Bully Report",
  heading: "What Occurred?",
  placeholder: "Tell us exactly what happened, and let us know if you were hurt in any way.",
} as const;

type Page = "danger" | "details" | "review";

export function ReportDetailsPage() {
  const router = useRouter();
  const [page, setPage] = useState<Page>("danger");
  const [form, setForm] = useState<FormState>(initialState);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ id: string; createdAt: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = COPY;

  const goToReview = () => {
    if (!form.description.trim()) {
      setDetailsError("Please fill in the description before continuing.");
      return;
    }
    setDetailsError(null);
    setPage("review");
  };

  const handleSubmit = () => {
    setSubmitError(null);

    const formData = new FormData();
    formData.set("in_immediate_danger", String(form.inImmediateDanger));
    formData.set("is_anonymous", String(form.isAnonymous));
    formData.set("victim_grade_section", form.victimGradeSection);
    formData.set("oppressor_grade_section", form.oppressorGradeSection);
    formData.set("oppressor_name", form.oppressorName);
    formData.set("setting", form.setting);
    form.evidence.forEach((file) => formData.append("evidence", file));

    formData.set("description", form.description);
    form.bullyingTypes.forEach((t) => formData.append("bullying_types", t));
    startTransition(async () => {
      const result = await submitBullyReport(formData);
      if ("error" in result) {
        setSubmitError(result.error);
        return;
      }
      setSubmitted({ id: result.id, createdAt: result.createdAt });
    });
  };

  if (submitted) {
    return <ConfirmationScreen urgent={form.inImmediateDanger} caseId={formatCaseId(submitted.id, submitted.createdAt)} />;
  }

  if (page === "danger") {
    return (
      <div className="mx-auto max-w-xl">
        <DangerCheck
          onContinue={(inDanger) => {
            setForm((f) => ({ ...f, inImmediateDanger: inDanger }));
            setPage("details");
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPage(page === "review" ? "details" : "danger")}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold">{copy.pageTitle}</h1>
        {form.inImmediateDanger ? (
          <span className="flex items-center gap-1 rounded-full bg-[var(--color-danger-100)] px-2.5 py-1 text-xs font-semibold text-[var(--color-danger-700)]">
            <AlertTriangle size={12} />
            URGENT
          </span>
        ) : (
          <span className="w-9" />
        )}
      </div>

      {page === "details" && (
        <div className="space-y-4">
          <Card>
            <SectionIcon icon={<FileText size={20} />} title={copy.heading} />
            <textarea
              className={`${inputClass} min-h-[9rem]`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={copy.placeholder}
            />

            <div className="mt-4">
              <FieldLabel>What type of bullying was this?</FieldLabel>
              <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                Select all that apply — an incident can involve more than one type.
              </p>
              <div className="flex flex-wrap gap-2">
                {BULLYING_TYPE_OPTIONS.map((opt) => {
                  const active = form.bullyingTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          bullyingTypes: active
                            ? f.bullyingTypes.filter((t) => t !== opt.value)
                            : [...f.bullyingTypes, opt.value],
                        }))
                      }
                      aria-pressed={active}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                          : "border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-background)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card>
            <SectionIcon icon={<Users size={20} />} title="People Involved" />
            <div>
              <FieldLabel>Victim</FieldLabel>
              <input
                className={inputClass}
                value={form.victimGradeSection}
                onChange={(e) => setForm((f) => ({ ...f, victimGradeSection: e.target.value }))}
                placeholder="Grade 10, Section Obsidian"
              />
            </div>
            <div className="mt-4">
              <FieldLabel>Oppressor</FieldLabel>
              <input
                className={inputClass}
                value={form.oppressorGradeSection}
                onChange={(e) => setForm((f) => ({ ...f, oppressorGradeSection: e.target.value }))}
                placeholder="Grade 11, Section Resourceful"
              />
              <input
                className={`${inputClass} mt-2`}
                value={form.oppressorName}
                onChange={(e) => setForm((f) => ({ ...f, oppressorName: e.target.value }))}
                placeholder="Add name if possible (optional)"
              />
            </div>
          </Card>

          <Card>
            <SectionIcon icon={<MapPin size={20} />} title="Setting" />
            <textarea
              className={inputClass}
              value={form.setting}
              onChange={(e) => setForm((f) => ({ ...f, setting: e.target.value }))}
              placeholder="Where and when the incident happened."
            />
          </Card>

          <Card>
            <SectionIcon
              icon={<Paperclip size={20} />}
              title="Evidence"
              subtitle="Optional — attach a photo, video, or screenshot."
            />

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] px-4 py-8 text-center">
              <ImagePlus className="text-[var(--color-text-muted)]" size={24} />
              <span className="text-sm font-medium">Tap to attach a photo, video, or screenshot</span>
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
                Files are encrypted at rest. Only your assigned counselor and school admin (for audits)
                can access them.
              </span>
            </div>
          </Card>

          {detailsError && (
            <p className="rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]">
              {detailsError}
            </p>
          )}

          <Button className="w-full" onClick={goToReview}>
            Continue to Review
          </Button>
        </div>
      )}

      {page === "review" && (
        <Card>
          <SectionIcon
            icon={<CheckCircle2 size={20} />}
            title="Report Review"
            subtitle="Confirm everything looks right before submitting."
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
            <ReviewRow icon={<FileText size={16} />} label={copy.heading} value={form.description} />
            <ReviewRow
              icon={<Users size={16} />}
              label="Type of Bullying"
              value={
                form.bullyingTypes
                  .map((t) => BULLYING_TYPE_OPTIONS.find((o) => o.value === t)?.label)
                  .filter(Boolean)
                  .join(", ") || ""
              }
            />
            <ReviewRow icon={<Users size={16} />} label="Victim" value={form.victimGradeSection} />
            <ReviewRow
              icon={<Users size={16} />}
              label="Oppressor"
              value={[form.oppressorGradeSection, form.oppressorName].filter(Boolean).join(" · ")}
            />
            <ReviewRow icon={<MapPin size={16} />} label="Setting" value={form.setting} />
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

          {submitError && (
            <p className="mt-3 rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]">
              {submitError}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/student")} disabled={pending}>
              Cancel
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
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{value}</p>
        ) : (
          <p className="mt-0.5 text-sm italic text-[var(--color-text-muted)]">Not provided</p>
        )}
      </div>
    </div>
  );
}
