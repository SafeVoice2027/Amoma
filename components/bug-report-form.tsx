"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import type { BugReportCategory } from "@/types/database";
import type { SubmitBugReportResult } from "@/app/student/help/actions";

const CATEGORY_VALUES: BugReportCategory[] = ["login", "report_submission", "notifications", "app_bug", "other"];

export function BugReportForm({
  submitBugReport,
}: {
  submitBugReport: (formData: FormData) => Promise<SubmitBugReportResult>;
}) {
  const { t } = useT();
  const [category, setCategory] = useState<BugReportCategory | "">("");
  const [otherCategory, setOtherCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  if (success) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} className="mt-0.5 flex-shrink-0 text-[var(--color-primary-600)]" />
          <div>
            <p className="font-medium">{t("bug.thanks")}</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {t("bug.thanksSub")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 min-h-0 px-4 py-2 text-sm"
          onClick={() => {
            setSuccess(false);
            setCategory("");
            setOtherCategory("");
            setDescription("");
          }}
        >
          {t("bug.another")}
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t("bug.title")}</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        {t("bug.sub")}
      </p>

      <form
        className="mt-4 space-y-4"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await submitBugReport(formData);
            if ("error" in result) setError(result.error);
            else setSuccess(true);
          });
        }}
      >
        <div className="space-y-2">
          {CATEGORY_VALUES.map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                category === value
                  ? "border-[var(--color-brand)] bg-[var(--color-primary-100)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-background)]"
              }`}
            >
              <input
                type="radio"
                name="category"
                value={value}
                checked={category === value}
                onChange={() => setCategory(value)}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              {t(`bug.${value}`)}
            </label>
          ))}
        </div>

        {category === "other" && (
          <input
            name="other_category"
            value={otherCategory}
            onChange={(e) => setOtherCategory(e.target.value)}
            placeholder={t("bug.otherPh")}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base outline-none focus:border-[var(--color-brand)] min-h-[3rem]"
          />
        )}

        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("bug.descPh")}
          rows={4}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base outline-none focus:border-[var(--color-brand)]"
        />

        {error && <p className="text-sm text-[var(--color-danger-600)]">{error}</p>}

        <Button type="submit" disabled={pending || !category || !description.trim()} className="w-full">
          {pending ? t("bug.sending") : t("bug.send")}
        </Button>
      </form>
    </Card>
  );
}
