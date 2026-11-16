"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { PasswordInput } from "@/components/password-input";
import type { ChangePasswordResult } from "@/app/student/actions";

const inputClass =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]";

// Shown once, over the student app, the first time a student signs in to an
// account the school created. They can choose their own password (the
// recommended way: nobody else, including whoever handed out the first
// password, then knows it) or keep the one from the school. Either answer
// ends the prompt for good.
export function FirstLoginPassword({
  setPassword,
  keepPassword,
}: {
  setPassword: (next: string) => Promise<ChangePasswordResult>;
  keepPassword: () => Promise<void>;
}) {
  const { t } = useT();
  const router = useRouter();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    if (next.length < 8) return setError(t("pw.short"));
    if (next !== confirm) return setError(t("pw.mismatch"));
    startTransition(async () => {
      const result = await setPassword(next);
      if (result.error) return setError(result.error === "short" ? t("pw.short") : t("pw.failed"));
      router.refresh();
    });
  };

  const keep = () => {
    startTransition(async () => {
      await keepPassword();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
          <KeyRound size={22} />
        </div>
        <h2 className="text-center text-lg font-semibold">{t("fl.title")}</h2>
        <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">{t("fl.body")}</p>

        <div className="mt-4 space-y-2">
          <PasswordInput
            autoComplete="new-password"
            className={inputClass}
            placeholder={t("pw.new")}
            value={next}
            onChange={setNext}
          />
          <PasswordInput
            autoComplete="new-password"
            className={inputClass}
            placeholder={t("pw.confirm")}
            value={confirm}
            onChange={setConfirm}
          />
          <p className="text-xs text-[var(--color-text-muted)]">{t("pw.hint")}</p>
          {error && (
            <p className="rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-xs text-[var(--color-danger-700)]">{error}</p>
          )}
        </div>

        <button
          type="button"
          disabled={pending || !next || !confirm}
          onClick={save}
          className="mt-4 w-full rounded-xl bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-brand)] disabled:opacity-50"
        >
          {pending ? t("pw.saving") : t("fl.save")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={keep}
          className="mt-3 w-full text-center text-sm font-medium text-[var(--color-text-muted)] underline"
        >
          {t("fl.keep")}
        </button>
      </div>
    </div>
  );
}
