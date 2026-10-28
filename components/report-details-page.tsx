"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { DangerCheck } from "@/components/danger-check";
import { ConfirmationScreen } from "@/components/confirmation-screen";
import { Button, Card } from "@/components/ui";
import { SectionIcon } from "@/components/wizard-header";
import { inputClass } from "@/components/wizard";
import { useT } from "@/components/i18n-provider";
import { submitBullyReport } from "@/app/student/report/actions";
import { formatCaseId } from "@/lib/reports/case-id";

// The report is just "What Occurred?" now — the type, people involved,
// when/where and evidence fields were removed. Staff and the AI classifier
// work from the description alone.
type Page = "danger" | "details" | "review" | "privacy";

export function ReportDetailsPage() {
  const router = useRouter();
  const { t } = useT();
  const [page, setPage] = useState<Page>("danger");
  const [inImmediateDanger, setInImmediateDanger] = useState(false);
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ id: string; createdAt: string; caseYear: number | null; caseSeq: number | null } | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [pending, startTransition] = useTransition();

  const goToReview = () => {
    if (!description.trim()) {
      setDetailsError(t("f.descError"));
      return;
    }
    setDetailsError(null);
    setPage("review");
  };

  const handleSubmit = () => {
    setSubmitError(null);

    const formData = new FormData();
    formData.set("in_immediate_danger", String(inImmediateDanger));
    formData.set("is_anonymous", String(isAnonymous));
    formData.set("description", description);
    startTransition(async () => {
      const result = await submitBullyReport(formData);
      if ("error" in result) {
        setSubmitError(t("f.submitError"));
        return;
      }
      setSubmitted({ id: result.id, createdAt: result.createdAt, caseYear: result.caseYear, caseSeq: result.caseSeq });
    });
  };

  if (submitted) {
    return (
      <ConfirmationScreen
        urgent={inImmediateDanger}
        caseId={formatCaseId(submitted.id, submitted.createdAt, { case_year: submitted.caseYear, case_seq: submitted.caseSeq })}
      />
    );
  }

  if (page === "danger") {
    return (
      <div className="mx-auto max-w-xl">
        <DangerCheck
          onContinue={(inDanger) => {
            setInImmediateDanger(inDanger);
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
          onClick={() => setPage(page === "privacy" ? "review" : page === "review" ? "details" : "danger")}
          aria-label={t("common.back")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold">{t("f.pageTitle")}</h1>
        {inImmediateDanger ? (
          <span className="flex items-center gap-1 rounded-full bg-[var(--color-danger-100)] px-2.5 py-1 text-xs font-semibold text-[var(--color-danger-700)]">
            <AlertTriangle size={12} />
            {t("f.urgentBadge")}
          </span>
        ) : (
          <span className="w-9" />
        )}
      </div>

      {page === "details" && (
        <div className="space-y-4">
          <Card>
            <SectionIcon icon={<FileText size={20} />} title={t("f.occurred")} />
            <textarea
              className={`${inputClass} min-h-[12rem]`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("f.occurredPh")}
            />
          </Card>

          {detailsError && (
            <p className="rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]">
              {detailsError}
            </p>
          )}

          <Button className="w-full" onClick={goToReview}>
            {t("f.continueReview")}
          </Button>
        </div>
      )}

      {page === "review" && (
        <Card>
          <SectionIcon icon={<CheckCircle2 size={20} />} title={t("f.reviewTitle")} subtitle={t("f.reviewSub")} />

          {inImmediateDanger && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-[var(--color-danger-50)] p-3 text-sm text-[var(--color-danger-700)]">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{t("f.urgentNotice")}</span>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-background)] text-[var(--color-text-muted)]">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("f.occurred")}</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-[var(--color-text-muted)]">{description}</p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-[var(--color-primary-50)] p-3 text-sm text-[var(--color-primary-800)]">
            <ShieldCheck size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{t("f.anonTitle")}</p>
              <p className="mt-0.5 text-[var(--color-text-muted)]">{t("f.anonBody")}</p>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
            {t("f.submitAnon")}
          </label>

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/student")}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1" onClick={() => setPage("privacy")}>
              {t("f.continue")}
            </Button>
          </div>
        </Card>
      )}

      {page === "privacy" && (
        <Card>
          <SectionIcon icon={<ShieldCheck size={20} />} title={t("dp.title")} subtitle={t("dp.sub")} />

          <div className="space-y-4 text-sm">
            {(["recorded", "why", "who", "identity", "rights"] as const).map((key) => (
              <div key={key}>
                <p className="font-medium">{t(`dp.${key}.title`)}</p>
                <p className="mt-0.5 text-[var(--color-text-muted)]">{t(`dp.${key}.body`)}</p>
              </div>
            ))}
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] p-3 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--color-brand)]"
            />
            <span>{t("dp.agree")}</span>
          </label>

          {submitError && (
            <p className="mt-3 rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]">
              {submitError}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => setPage("review")} disabled={pending}>
              {t("common.back")}
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={pending || !agreed}>
              {pending ? t("f.submitting") : t("f.submit")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
