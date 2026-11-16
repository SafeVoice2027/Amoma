"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useT } from "@/components/i18n-provider";

// A password box with an eye button that shows / hides what was typed, so a
// student can check their new password before saving it.
export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  className: string;
}) {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className={`${className} pr-10`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("pw.hide") : t("pw.show")}
        title={visible ? t("pw.hide") : t("pw.show")}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
