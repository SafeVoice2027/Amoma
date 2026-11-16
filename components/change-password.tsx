"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { PasswordInput } from "@/components/password-input";
import type { ChangePasswordResult } from "@/app/student/actions";

const inputClass =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]";

// Student Settings: change your own password. Only reachable when signed in
// to that account, and it asks for the current password first, so someone who
// picks up an unlocked phone can't quietly lock the student out. The three
// boxes stay hidden until the student presses "Change password", and fold
// away again after a successful change (the confirmation stays under the button).
export function ChangePassword({
  changePassword,
}: {
  changePassword: (current: string, next: string) => Promise<ChangePasswordResult>;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const submit = () => {
    setMessage(null);
    if (next.length < 8) return setMessage({ kind: "error", text: t("pw.short") });
    if (next !== confirm) return setMessage({ kind: "error", text: t("pw.mismatch") });

    startTransition(async () => {
      const result = await changePassword(current, next);
      if (result.error) {
        const text =
          result.error === "wrong_current"
            ? t("pw.wrongCurrent")
            : result.error === "short"
              ? t("pw.short")
              : result.error === "same"
                ? t("pw.same")
                : t("pw.failed");
        setMessage({ kind: "error", text });
        return;
      }
      reset();
      setOpen(false);
      setMessage({ kind: "success", text: t("pw.saved") });
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setMessage(null);
        }}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-background)]"
      >
        <KeyRound size={16} />
        {t("pw.change")}
      </button>

      {!open && message?.kind === "success" && (
        <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">{message.text}</p>
      )}

      {open && (
        <div className="mt-2 space-y-2">
          <PasswordInput
            autoComplete="current-password"
            className={inputClass}
            placeholder={t("pw.current")}
            value={current}
            onChange={setCurrent}
          />
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

          {message?.kind === "error" && (
            <p className="rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-xs text-[var(--color-danger-700)]">
              {message.text}
            </p>
          )}

          <button
            type="button"
            disabled={pending || !current || !next || !confirm}
            onClick={submit}
            className="w-full rounded-xl bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-brand)] disabled:opacity-50"
          >
            {pending ? t("pw.saving") : t("pw.save")}
          </button>
        </div>
      )}
    </div>
  );
}
