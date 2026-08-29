"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { BugReportCategory } from "@/types/database";
import type { SubmitBugReportResult } from "@/app/student/help/actions";

const CATEGORY_OPTIONS: { value: BugReportCategory; label: string }[] = [
  { value: "login", label: "Trouble logging in" },
  { value: "report_submission", label: "Problem submitting a report" },
  { value: "notifications", label: "Notifications not working" },
  { value: "app_bug", label: "Something in the app is broken" },
  { value: "other", label: "Others" },
];

export function BugReportForm({
  submitBugReport,
}: {
  submitBugReport: (formData: FormData) => Promise<SubmitBugReportResult>;
}) {
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
            <p className="font-medium">Thanks for letting us know.</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Our team will look into it. You can send another report anytime.
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
          Send another
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Report a bug</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Found something that isn&apos;t working right? Let us know and we&apos;ll take a look.
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
          {CATEGORY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                category === opt.value
                  ? "border-[var(--color-brand)] bg-[var(--color-primary-100)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-background)]"
              }`}
            >
              <input
                type="radio"
                name="category"
                value={opt.value}
                checked={category === opt.value}
                onChange={() => setCategory(opt.value)}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {category === "other" && (
          <input
            name="other_category"
            value={otherCategory}
            onChange={(e) => setOtherCategory(e.target.value)}
            placeholder="Briefly, what's this about?"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base outline-none focus:border-[var(--color-brand)] min-h-[3rem]"
          />
        )}

        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what happened..."
          rows={4}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base outline-none focus:border-[var(--color-brand)]"
        />

        {error && <p className="text-sm text-[var(--color-danger-600)]">{error}</p>}

        <Button type="submit" disabled={pending || !category || !description.trim()} className="w-full">
          {pending ? "Sending..." : "Send report"}
        </Button>
      </form>
    </Card>
  );
}
